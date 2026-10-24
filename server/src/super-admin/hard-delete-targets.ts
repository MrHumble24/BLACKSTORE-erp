import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HardDeleteType } from './dto/hard-delete.dto';

/**
 * Shared "collect targets" engine for hard delete. Preview and execute both call
 * {@link collectTargets} so the blast radius they report and delete can never drift.
 * Accepts either the PrismaService or a transaction client (Prisma.TransactionClient).
 */
type Db = Prisma.TransactionClient;

/** One whole receipt that will be deleted, shown in the preview so the UI can warn WHO is hit. */
export interface SaleSummary {
  saleId: number;
  customerName: string | null; // customer or partner name; null = walk-in cash sale
  total: string;
  paid: string;
  itemCount: number;
}

/** Read-only blast-radius report (FR for F12 preview). All money is a decimal string. */
export interface HardDeleteReport {
  counts: {
    productModels: number;
    items: number;
    accessoryStock: number;
    itemIdentifiers: number;
  };
  sales: SaleSummary[];
  salesCount: number;
  salePaymentCount: number;
  salePaymentSum: string;
  returnsCount: number;
  returnRefundSum: string;
  customers: string[]; // distinct debtor names whose whole receipts vanish
  investors: string[]; // distinct owners of the items being deleted
}

/** Frozen id sets that drive both the snapshot and the delete, plus the preview report. */
export interface HardDeleteTargets {
  type: HardDeleteType;
  id: number;
  categoryId: number | null;
  productModelIds: number[];
  itemIds: number[];
  saleIds: number[];
  // Items sold on the deleted sales that are NOT themselves being deleted; restocked to IN_STOCK.
  survivingItemIds: number[];
  report: HardDeleteReport;
}

/** Decimal (or null) → fixed money string. */
function money(value: Prisma.Decimal | null | undefined): string {
  return (value ?? new Prisma.Decimal(0)).toString();
}

/**
 * Resolves the target into the item / product-model / category id sets it cascades to.
 * Throws 404 if the target itself does not exist (so we never take a backup for nothing).
 */
async function resolveScope(
  db: Db,
  type: HardDeleteType,
  id: number,
): Promise<{ categoryId: number | null; productModelIds: number[]; itemIds: number[] }> {
  if (type === 'item') {
    if (!(await db.item.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Item not found');
    }
    return { categoryId: null, productModelIds: [], itemIds: [id] };
  }
  if (type === 'productModel') {
    if (!(await db.productModel.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Product model not found');
    }
    const items = await db.item.findMany({ where: { productModelId: id }, select: { id: true } });
    return { categoryId: null, productModelIds: [id], itemIds: items.map((i) => i.id) };
  }
  if (!(await db.category.findUnique({ where: { id }, select: { id: true } }))) {
    throw new NotFoundException('Category not found');
  }
  const models = await db.productModel.findMany({ where: { categoryId: id }, select: { id: true } });
  const productModelIds = models.map((m) => m.id);
  const items = productModelIds.length
    ? await db.item.findMany({ where: { productModelId: { in: productModelIds } }, select: { id: true } })
    : [];
  return { categoryId: id, productModelIds, itemIds: items.map((i) => i.id) };
}

/** Distinct sales that carry any to-be-deleted item or accessory line (whole-sale rule). */
async function collectSaleIds(db: Db, itemIds: number[], productModelIds: number[]): Promise<number[]> {
  const or: Prisma.SaleItemWhereInput[] = [];
  if (itemIds.length) or.push({ itemId: { in: itemIds } });
  if (productModelIds.length) or.push({ productModelId: { in: productModelIds } });
  if (!or.length) return [];
  const rows = await db.saleItem.findMany({
    where: { OR: or },
    select: { saleId: true },
    distinct: ['saleId'],
  });
  return rows.map((r) => r.saleId);
}

/**
 * Items carried on the deleted sales whose own Item row is NOT in the delete set (e.g. a
 * different-category device sharing the receipt). Their sale is vanishing, so they must return
 * to sellable stock instead of being orphaned as SOLD/DEBT with no sale record.
 */
async function collectSurvivingItemIds(db: Db, saleIds: number[], deleteItemIds: number[]): Promise<number[]> {
  if (!saleIds.length) return [];
  const rows = await db.saleItem.findMany({
    where: { saleId: { in: saleIds }, itemId: { not: null } },
    select: { itemId: true },
    distinct: ['itemId'],
  });
  const beingDeleted = new Set(deleteItemIds);
  return rows
    .map((r) => r.itemId)
    .filter((id): id is number => id != null && !beingDeleted.has(id));
}

/** The whole-sale summaries plus the payment/return totals for the deleted sales. */
async function summarizeSales(db: Db, saleIds: number[]) {
  if (!saleIds.length) {
    return { sales: [] as SaleSummary[], payCount: 0, paySum: '0', retCount: 0, retSum: '0' };
  }
  const rows = await db.sale.findMany({
    where: { id: { in: saleIds } },
    select: {
      id: true,
      total: true,
      customer: { select: { name: true } },
      partner: { select: { name: true } },
      payments: { select: { amount: true } },
      _count: { select: { items: true } },
    },
  });
  const sales: SaleSummary[] = rows.map(({ id, total, customer, partner, payments, _count }) => ({
    saleId: id,
    customerName: customer?.name ?? partner?.name ?? null,
    total: money(total),
    paid: money(payments.reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0))),
    itemCount: _count.items,
  }));
  const where = { saleId: { in: saleIds } };
  const { _count: payCount, _sum: paySum } = await db.salePayment.aggregate({ where, _count: true, _sum: { amount: true } });
  const { _count: retCount, _sum: retSum } = await db.return.aggregate({ where, _count: true, _sum: { refundAmount: true } });
  return { sales, payCount, paySum: money(paySum.amount), retCount, retSum: money(retSum.refundAmount) };
}

/** Builds the read-only blast-radius report from the frozen id sets. */
async function buildReport(
  db: Db,
  scope: { productModelIds: number[]; itemIds: number[] },
  saleIds: number[],
): Promise<HardDeleteReport> {
  const { itemIds, productModelIds } = scope;
  const accessoryStock = productModelIds.length
    ? await db.accessoryStock.count({ where: { productModelId: { in: productModelIds } } })
    : 0;
  const itemIdentifiers = itemIds.length
    ? await db.itemIdentifier.count({ where: { itemId: { in: itemIds } } })
    : 0;
  const { sales, payCount, paySum, retCount, retSum } = await summarizeSales(db, saleIds);
  const investorRows = itemIds.length
    ? await db.investor.findMany({ where: { items: { some: { id: { in: itemIds } } } }, select: { name: true } })
    : [];

  return {
    counts: { productModels: productModelIds.length, items: itemIds.length, accessoryStock, itemIdentifiers },
    sales,
    salesCount: saleIds.length,
    salePaymentCount: payCount,
    salePaymentSum: paySum,
    returnsCount: retCount,
    returnRefundSum: retSum,
    customers: [...new Set(sales.map((s) => s.customerName).filter((n): n is string => !!n))],
    investors: investorRows.map((i) => i.name),
  };
}

/**
 * The single entry point: resolves the cascade, finds every whole sale it touches and
 * builds the report. Call it for preview (read-only) and again inside the delete
 * transaction, so the two never disagree about what the blast radius is.
 */
export async function collectTargets(
  db: Db,
  input: { type: HardDeleteType; id: number },
): Promise<HardDeleteTargets> {
  const scope = await resolveScope(db, input.type, input.id);
  const saleIds = await collectSaleIds(db, scope.itemIds, scope.productModelIds);
  const survivingItemIds = await collectSurvivingItemIds(db, saleIds, scope.itemIds);
  const report = await buildReport(db, scope, saleIds);
  return { type: input.type, id: input.id, ...scope, saleIds, survivingItemIds, report };
}
