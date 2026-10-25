import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { itemLabel } from '../common/item-brief';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPartnerTransactionsDto } from './dto/query-partner-transactions.dto';

type Kind = 'HANDOVER' | 'SOLD' | 'RETURNED' | 'PAYMENT' | 'REFUND';
type Ref = { id: number; name: string };

/** One partner event in the feed (contract F29-API-01). */
export interface PartnerTransaction {
  id: string;
  kind: Kind;
  date: string;
  partner: Ref;
  user: Ref | null;
  item: string | null;
  count: number;
  amount: string;
  method: PaymentMethod | null;
  saleId: number | null;
  consignmentId: number | null;
}

const ref = { select: { id: true, name: true } } as const;
// Only the label pieces of an Item: never the full row (it holds purchasePrice/extraCost).
const itemLabelSelect = {
  select: { productModel: { select: { name: true } }, identifiers: { select: { value: true }, orderBy: { id: 'asc' }, take: 1 } },
} satisfies { select: Prisma.ItemSelect };

const handoverSelect = { id: true, date: true, partner: ref, handedBy: ref, items: { select: { minPrice: true } } } satisfies Prisma.ConsignmentSelect;
const soldSelect = {
  id: true,
  minPrice: true,
  soldAt: true,
  consignment: { select: { id: true, partner: ref } },
  item: itemLabelSelect,
  saleItem: { select: { unitPrice: true, sale: { select: { id: true, seller: ref } } } },
} satisfies Prisma.ConsignmentItemSelect;
const returnedSelect = {
  id: true,
  minPrice: true,
  returnedAt: true,
  consignment: { select: { id: true, partner: ref } },
  item: itemLabelSelect,
} satisfies Prisma.ConsignmentItemSelect;
const paymentSelect = {
  id: true,
  amount: true,
  method: true,
  date: true,
  receiver: ref,
  sale: { select: { id: true, partner: ref } },
} satisfies Prisma.SalePaymentSelect;
const refundSelect = {
  id: true,
  refundAmount: true,
  date: true,
  user: ref,
  sale: { select: { id: true, partner: ref } },
  saleItem: { select: { productModel: { select: { name: true } }, item: { select: { identifiers: itemLabelSelect.select.identifiers } } } },
} satisfies Prisma.ReturnSelect;

/** Base fields every row shares; the per-kind mappers fill the rest. */
// `date` is nullable only in the types: soldAt/returnedAt rows are loaded by a range on that column.
function tx(kind: Kind, id: number, date: Date | null, partner: Ref, amount: Prisma.Decimal): PartnerTransaction {
  return {
    id: `${kind}:${id}`,
    kind,
    date: (date ?? new Date(0)).toISOString(),
    partner,
    user: null,
    item: null,
    count: 1,
    amount: amount.toFixed(2),
    method: null,
    saleId: null,
    consignmentId: null,
  };
}

/** Read-only feed of every partner event in a date range (F29, FR-26, W4); writes nothing. */
@Injectable()
export class PartnerTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest-first page of HANDOVER/SOLD/RETURNED/PAYMENT/REFUND events plus totals over the whole range. */
  async findAll(query: QueryPartnerTransactionsDto) {
    const range = toRange(query.from, query.to);
    const partnerSale = { partnerId: { not: null } };
    const [handovers, sold, returned, payments, refunds] = await Promise.all([
      this.prisma.consignment.findMany({ where: { date: range }, select: handoverSelect }),
      this.prisma.consignmentItem.findMany({ where: { soldAt: range }, select: soldSelect }),
      this.prisma.consignmentItem.findMany({ where: { returnedAt: range }, select: returnedSelect }),
      this.prisma.salePayment.findMany({ where: { date: range, sale: partnerSale }, select: paymentSelect }),
      this.prisma.return.findMany({ where: { date: range, sale: partnerSale }, select: refundSelect }),
    ]);
    // ponytail: in-memory merge and paginate; MAX_RANGE_MS (toRange) is what keeps this bounded, switch to a SQL UNION if a year of rows ever gets slow.
    const all = [
      ...handovers.map(fromHandover),
      ...sold.map(fromSold),
      ...returned.map(fromReturned),
      ...payments.flatMap(fromPayment),
      ...refunds.flatMap(fromRefund),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const skip = (query.page - 1) * query.pageSize;
    return {
      items: all.slice(skip, skip + query.pageSize),
      total: all.length,
      page: query.page,
      pageSize: query.pageSize,
      totals: totalsOf(all),
    };
  }
}

/** Longest allowed range (366 days), so the in-memory merge above stays bounded. */
const MAX_RANGE_MS = 366 * 864e5;

/** Inclusive Date range; 400 when a bound is invalid, `from` is after `to`, or the range is over MAX_RANGE_MS. */
function toRange(from: string, to: string) {
  const gte = new Date(from);
  const lte = new Date(to);
  if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) throw new BadRequestException('Invalid date range');
  if (gte > lte) throw new BadRequestException('"from" must not be after "to"');
  if (lte.getTime() - gte.getTime() > MAX_RANGE_MS) throw new BadRequestException('Range too long');
  return { gte, lte };
}

/** Sums each kind's amounts with Decimal over the whole merged list (not just the page). */
function totalsOf(all: PartnerTransaction[]) {
  const sums: Record<Kind, Prisma.Decimal> = {
    HANDOVER: new Prisma.Decimal(0),
    SOLD: new Prisma.Decimal(0),
    RETURNED: new Prisma.Decimal(0),
    PAYMENT: new Prisma.Decimal(0),
    REFUND: new Prisma.Decimal(0),
  };
  for (const t of all) sums[t.kind] = sums[t.kind].plus(t.amount);
  return {
    handedOver: sums.HANDOVER.toFixed(2),
    sold: sums.SOLD.toFixed(2),
    returned: sums.RETURNED.toFixed(2),
    paid: sums.PAYMENT.toFixed(2),
    refunded: sums.REFUND.toFixed(2),
  };
}

type Handover = Prisma.ConsignmentGetPayload<{ select: typeof handoverSelect }>;
type Sold = Prisma.ConsignmentItemGetPayload<{ select: typeof soldSelect }>;
type Returned = Prisma.ConsignmentItemGetPayload<{ select: typeof returnedSelect }>;
type Payment = Prisma.SalePaymentGetPayload<{ select: typeof paymentSelect }>;
type Refund = Prisma.ReturnGetPayload<{ select: typeof refundSelect }>;

/** HANDOVER: Σ minPrice of the consignment's items, count = number of items. */
function fromHandover(c: Handover): PartnerTransaction {
  const amount = c.items.reduce((sum, i) => sum.plus(i.minPrice), new Prisma.Decimal(0));
  return { ...tx('HANDOVER', c.id, c.date, c.partner, amount), user: c.handedBy, count: c.items.length, consignmentId: c.id };
}

/** SOLD: amount is the sale-time unit price copied onto the sale line (BR-7). */
function fromSold(ci: Sold): PartnerTransaction {
  const base = tx('SOLD', ci.id, ci.soldAt, ci.consignment.partner, ci.saleItem?.unitPrice ?? ci.minPrice);
  return {
    ...base,
    user: ci.saleItem?.sale.seller ?? null,
    item: itemLabel(ci.item.productModel, ci.item.identifiers),
    saleId: ci.saleItem?.sale.id ?? null,
    consignmentId: ci.consignment.id,
  };
}

/** RETURNED: the item's minPrice; no user is stored on a consignment return. */
function fromReturned(ci: Returned): PartnerTransaction {
  const base = tx('RETURNED', ci.id, ci.returnedAt, ci.consignment.partner, ci.minPrice);
  return { ...base, item: itemLabel(ci.item.productModel, ci.item.identifiers), consignmentId: ci.consignment.id };
}

/** PAYMENT on a partner sale (the where clause guarantees a partner; flatMap keeps types honest). */
function fromPayment(p: Payment): PartnerTransaction[] {
  if (!p.sale.partner) return [];
  return [{ ...tx('PAYMENT', p.id, p.date, p.sale.partner, p.amount), user: p.receiver, method: p.method, saleId: p.sale.id }];
}

/** REFUND: a Return on a partner sale; lowers partner debt (BR-8). */
function fromRefund(r: Refund): PartnerTransaction[] {
  if (!r.sale.partner) return [];
  const base = tx('REFUND', r.id, r.date, r.sale.partner, r.refundAmount);
  return [{ ...base, user: r.user, item: itemLabel(r.saleItem.productModel, r.saleItem.item?.identifiers), saleId: r.sale.id }];
}
