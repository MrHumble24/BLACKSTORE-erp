import { IdentifierType, Prisma, ReturnResult, SaleStatus, ShareType } from '@prisma/client';

const ZERO = new Prisma.Decimal(0);

// ── Loading ──────────────────────────────────────────────

/** Everything a profit/investor report needs from a sale in one query (no N+1). */
export const reportSaleSelect = {
  id: true,
  status: true,
  createdAt: true,
  location: { select: { id: true, name: true } },
  payments: { select: { date: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      unitCost: true,
      shareType: true,
      shareValue: true,
      investor: { select: { id: true, name: true, isOwn: true } },
      item: {
        select: { id: true, identifiers: { select: { type: true, value: true }, orderBy: { id: 'asc' } } },
      },
      productModel: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
    },
  },
  returns: { select: { id: true, saleItemId: true, quantity: true, refundAmount: true, result: true, date: true } },
} satisfies Prisma.SaleSelect;

export type ReportSaleRow = Prisma.SaleGetPayload<{ select: typeof reportSaleSelect }>;
type ReportItem = ReportSaleRow['items'][number];
type ReportReturn = ReportSaleRow['returns'][number];

// ── Line type ────────────────────────────────────────────

/** One report line in Decimal form; SALE for each sold item, RETURN for each refund (FR-28, FR-23). */
export interface ProfitLine {
  kind: 'SALE' | 'RETURN';
  saleId: number;
  saleItemId: number;
  returnId: number | null;
  profitDate: Date;
  item: { id: number; code: string; model: string } | null;
  productModel: string;
  quantity: number;
  investor: { id: number; name: string } | null;
  location: { id: number; name: string };
  category: { id: number; name: string };
  salePrice: Prisma.Decimal;
  refunded: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
  investorShare: Prisma.Decimal;
  businessShare: Prisma.Decimal;
}

// ── Builder ──────────────────────────────────────────────

/**
 * BR-6 gate, status only: PAID or RETURNED sales count. A debt sale closed by a refund still had
 * real money received, and its SALE and RETURN lines net to what was kept.
 */
function counts(sale: ReportSaleRow): boolean {
  return sale.status === SaleStatus.PAID || sale.status === SaleStatus.RETURNED;
}

/** profitDate for SALE lines: the last payment date, or the sale date when it has none. */
function lastPaymentDate(sale: ReportSaleRow): Date {
  return sale.payments.reduce((max, p) => (p.date > max ? p.date : max), sale.createdAt);
}

/** All report lines for one sale, or [] when the BR-6 gate blocks it (both lines or neither). */
export function buildLinesForSale(sale: ReportSaleRow): ProfitLine[] {
  if (!counts(sale)) return [];
  const saleDate = lastPaymentDate(sale);
  const byItemId = new Map(sale.items.map((i) => [i.id, i]));
  const lines: ProfitLine[] = sale.items.map((item) => saleLine(sale, item, saleDate));
  for (const ret of sale.returns) {
    const item = byItemId.get(ret.saleItemId);
    if (item) lines.push(returnLine(sale, item, ret));
  }
  return lines;
}

/** SALE line: profit = salePrice − cost; refunded 0. */
function saleLine(sale: ReportSaleRow, item: ReportItem, profitDate: Date): ProfitLine {
  const salePrice = item.unitPrice.times(item.quantity);
  const cost = item.unitCost.times(item.quantity);
  const profit = salePrice.minus(cost);
  const investorShare = investorShareFor(profit, item, item.quantity, 'SALE').toDecimalPlaces(2);
  return {
    kind: 'SALE', saleId: sale.id, saleItemId: item.id, returnId: null, profitDate,
    ...context(sale, item), quantity: item.quantity,
    salePrice, refunded: ZERO, cost, profit, investorShare, businessShare: profit.minus(investorShare),
  };
}

/** RETURN line (FR-23): the loss booked on the return day; cost comes back only BACK_TO_STOCK. */
function returnLine(sale: ReportSaleRow, item: ReportItem, ret: ReportReturn): ProfitLine {
  const refunded = ret.refundAmount;
  const cost = ret.result === ReturnResult.BACK_TO_STOCK ? item.unitCost.times(ret.quantity).negated() : ZERO;
  const profit = refunded.negated().minus(cost); // profit = −refunded − cost
  const investorShare = investorShareFor(profit, item, ret.quantity, 'RETURN').toDecimalPlaces(2);
  return {
    kind: 'RETURN', saleId: sale.id, saleItemId: item.id, returnId: ret.id, profitDate: ret.date,
    ...context(sale, item), quantity: ret.quantity,
    salePrice: ZERO, refunded, cost, profit, investorShare, businessShare: profit.minus(investorShare),
  };
}

/** The shared item/location/category/investor context of both line kinds. */
function context(sale: ReportSaleRow, item: ReportItem) {
  // Every sale line carries a productModel in practice; the fallbacks only satisfy the nullable type.
  const model = item.productModel;
  return {
    item: item.item ? { id: item.item.id, code: identifierCode(item.item.identifiers), model: model?.name ?? '' } : null,
    productModel: model?.name ?? '',
    investor: item.investor ? { id: item.investor.id, name: item.investor.name } : null,
    location: sale.location,
    category: model?.category ?? { id: 0, name: '' },
  };
}

/** Prefers the printed SYSTEM_CODE, falling back to the first identifier, else empty. */
function identifierCode(identifiers: { type: IdentifierType; value: string }[]): string {
  const system = identifiers.find((i) => i.type === IdentifierType.SYSTEM_CODE);
  return system?.value ?? identifiers[0]?.value ?? '';
}

// ── Investor split (BR-2, BR-3, BR-4) ────────────────────

/** Investor share of one line's profit; own/accessory → 0, else by the snapshot share type. */
function investorShareFor(profit: Prisma.Decimal, item: ReportItem, quantity: number, kind: 'SALE' | 'RETURN'): Prisma.Decimal {
  if (item.investor == null || item.investor.isOwn === true) return ZERO;
  switch (item.shareType) {
    case ShareType.NONE:
      return profit; // investor gets all the profit (client-confirmed)
    case ShareType.PERCENT:
      return profit.times(item.shareValue).dividedBy(100);
    case ShareType.FIXED_PER_ITEM:
      return fixedShare(profit, item.shareValue, quantity, kind);
  }
}

/**
 * BR-4 literal: on a SALE line the business keeps the fixed amount per item (share can go
 * negative; client-unconfirmed). On a RETURN line the fixed was already taken, so the
 * investor absorbs the whole reversed profit (not taken twice). Kept in one place on purpose.
 */
function fixedShare(profit: Prisma.Decimal, shareValue: Prisma.Decimal, quantity: number, kind: 'SALE' | 'RETURN'): Prisma.Decimal {
  if (kind === 'RETURN') return profit;
  return profit.minus(shareValue.times(quantity));
}

// ── Aggregation (totals and groups) ──────────────────────

/** Money totals over a set of lines; `expenses`/`otherIncome`/`netProfit` are added by the service. */
export interface LineTotals {
  sales: Prisma.Decimal;
  refunded: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
  investorShare: Prisma.Decimal;
  businessShare: Prisma.Decimal;
}

/** Net items represented by a line: a sold item adds, a returned item subtracts. */
function signedQuantity(line: ProfitLine): number {
  return line.kind === 'SALE' ? line.quantity : -line.quantity;
}

/** Sums every money column over the given lines. */
export function sumLines(lines: ProfitLine[]): LineTotals {
  return lines.reduce<LineTotals>(
    (t, l) => ({
      sales: t.sales.plus(l.salePrice),
      refunded: t.refunded.plus(l.refunded),
      cost: t.cost.plus(l.cost),
      profit: t.profit.plus(l.profit),
      investorShare: t.investorShare.plus(l.investorShare),
      businessShare: t.businessShare.plus(l.businessShare),
    }),
    { sales: ZERO, refunded: ZERO, cost: ZERO, profit: ZERO, investorShare: ZERO, businessShare: ZERO },
  );
}

/** One group row (by investor, location or category). */
export interface ProfitGroupAcc {
  id: number;
  name: string;
  quantity: number;
  sales: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
  investorShare: Prisma.Decimal;
  businessShare: Prisma.Decimal;
}

/** Groups lines by a caller-chosen key (e.g. investor); preserves first-seen order. */
export function groupLines(lines: ProfitLine[], key: (l: ProfitLine) => { id: number; name: string }): ProfitGroupAcc[] {
  const groups = new Map<number, ProfitGroupAcc>();
  for (const line of lines) {
    const { id, name } = key(line);
    const g =
      groups.get(id) ??
      { id, name, quantity: 0, sales: ZERO, cost: ZERO, profit: ZERO, investorShare: ZERO, businessShare: ZERO };
    g.quantity += signedQuantity(line);
    g.sales = g.sales.plus(line.salePrice);
    g.cost = g.cost.plus(line.cost);
    g.profit = g.profit.plus(line.profit);
    g.investorShare = g.investorShare.plus(line.investorShare);
    g.businessShare = g.businessShare.plus(line.businessShare);
    groups.set(id, g);
  }
  return [...groups.values()];
}
