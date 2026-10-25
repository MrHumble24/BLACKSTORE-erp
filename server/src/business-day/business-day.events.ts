import { ExpenseStatus, InvestorTxType, LedgerType, PaymentMethod, Prisma } from '@prisma/client';
import { itemLabel } from '../common/item-brief';
import { lineTotal } from '../common/money';
import { countsAtOwnTime, saleMoney } from './business-day.sale-gate';
import {
  ConfirmedSale, DayWindow, DbClient, itemNameSelect, returnLabel, userBrief, WindowLedger, WindowPayment, WindowReturn, WindowSale, WindowWalkIn,
  windowRange,
} from './business-day.mappers';

/**
 * Day events feed (F30): every record of the open day's window as one chronological list, newest first.
 * Money rows reuse the drawer window (immutable createdAt); the rest are informational and never touch expected cash.
 * Translation rule: title/subtitle carry raw data only (names, reasons, identifiers); every word the client
 * shows (counts, fee, method, finished) comes from structured fields and is translated there.
 * ponytail: no pagination, one day of events; add it if a day ever exceeds a few hundred rows.
 */

export type DayEventKind =
  | 'SALE' | 'SALE_CONFIRMED' | 'PAYMENT' | 'RETURN' | 'EXPENSE' | 'INCOME' | 'WALK_IN_PURCHASE' | 'WALK_IN_PAYOUT'
  | 'SUPPLIER_PAYMENT' | 'INVESTOR_DEPOSIT' | 'INVESTOR_PAYOUT' | 'BATCH_RECEIVED'
  | 'STOCK_RECEIVED' | 'HANDOVER' | 'CONSIGNMENT_SOLD' | 'CONSIGNMENT_RETURNED' | 'TRANSFER' | 'STOCK_COUNT';
type RefType = 'SALE' | 'PAYMENT' | 'RETURN' | 'EXPENSE' | 'INCOME';
type UserBrief = { id: number; name: string };

export interface DayEvent {
  id: string;
  kind: DayEventKind;
  time: string;
  user: UserBrief | null;
  title: string;
  subtitle: string | null;
  /** Items in a handover / transfer / batch / accessory line; null for other kinds. */
  count: number | null;
  /** Supplier payment fee as a decimal string; null when zero or not a supplier payment. */
  fee: string | null;
  /** Stock count state; null for other kinds. */
  finished: boolean | null;
  /** Payment method; null for non-payments. */
  method: 'CASH' | 'CARD' | null;
  amount: string | null;
  cash: string | null;
  card: string | null;
  refType: RefType | null;
  refId: number | null;
}

const supplierPaymentSelect = { id: true, amount: true, fee: true, date: true, supplier: { select: { name: true } } } satisfies Prisma.SupplierPaymentSelect;
const investorTxSelect = { id: true, type: true, amount: true, date: true, note: true, investor: { select: { name: true } } } satisfies Prisma.InvestorTransactionSelect;
const batchLineSelect = {
  unitPrice: true, quantity: true, createdAt: true, batch: { select: { id: true, supplier: { select: { name: true } } } },
} satisfies Prisma.PurchaseLineSelect;
const stockLineSelect = {
  id: true, unitPrice: true, quantity: true, createdAt: true, item: itemNameSelect, productModel: { select: { name: true } },
} satisfies Prisma.PurchaseLineSelect;
const consignmentSelect = {
  id: true, date: true, handedBy: userBrief, partner: { select: { name: true } }, items: { select: { minPrice: true } },
} satisfies Prisma.ConsignmentSelect;
const consignmentItemSelect = {
  id: true, minPrice: true, soldAt: true, returnedAt: true, item: itemNameSelect,
  saleItem: { select: { unitPrice: true } }, consignment: { select: { partner: { select: { name: true } } } },
} satisfies Prisma.ConsignmentItemSelect;
const transferSelect = {
  id: true, date: true, user: userBrief, fromLocation: { select: { name: true } }, toLocation: { select: { name: true } },
  _count: { select: { items: true, accessories: true } },
} satisfies Prisma.TransferSelect;
const stockCountSelect = { id: true, startedAt: true, finishedAt: true, user: userBrief, location: { select: { name: true } } } satisfies Prisma.StockCountSelect;

type SupplierPaymentRow = Prisma.SupplierPaymentGetPayload<{ select: typeof supplierPaymentSelect }>;
type InvestorTxRow = Prisma.InvestorTransactionGetPayload<{ select: typeof investorTxSelect }>;
type BatchLineRow = Prisma.PurchaseLineGetPayload<{ select: typeof batchLineSelect }>;
type StockLineRow = Prisma.PurchaseLineGetPayload<{ select: typeof stockLineSelect }>;
type ConsignmentRow = Prisma.ConsignmentGetPayload<{ select: typeof consignmentSelect }>;
type ConsignmentItemRow = Prisma.ConsignmentItemGetPayload<{ select: typeof consignmentItemSelect }>;
type TransferRow = Prisma.TransferGetPayload<{ select: typeof transferSelect }>;
type StockCountRow = Prisma.StockCountGetPayload<{ select: typeof stockCountSelect }>;

/** Window rows the drawer math does not load (the feed's informational kinds). */
export interface ExtraEventRows {
  supplierPayments: SupplierPaymentRow[];
  investorTxs: InvestorTxRow[];
  batchLines: BatchLineRow[];
  stockLines: StockLineRow[];
  consignments: ConsignmentRow[];
  consignmentSold: ConsignmentItemRow[];
  consignmentReturned: ConsignmentItemRow[];
  transfers: TransferRow[];
  stockCounts: StockCountRow[];
}

/** Loads the informational rows of the open day [openedAt, now) in one parallel round trip. */
export async function loadEvents(client: DbClient, openedAt: Date): Promise<ExtraEventRows> {
  const range = windowRange(openedAt);
  // `date` is user-editable: cap at now so a future-dated row does not show in every open day.
  const dateRange = { gte: openedAt, lte: new Date() };
  const [supplierPayments, investorTxs, batchLines, stockLines, consignments, consignmentSold, consignmentReturned, transfers, stockCounts] =
    await Promise.all([
      client.supplierPayment.findMany({ where: { date: dateRange }, select: supplierPaymentSelect }),
      client.investorTransaction.findMany({ where: { date: dateRange }, select: investorTxSelect }),
      client.purchaseLine.findMany({ where: { createdAt: range, batchId: { not: null } }, select: batchLineSelect }),
      client.purchaseLine.findMany({ where: { createdAt: range, batchId: null, walkInSellerId: null }, select: stockLineSelect }),
      client.consignment.findMany({ where: { date: range }, select: consignmentSelect }),
      client.consignmentItem.findMany({ where: { soldAt: range }, select: consignmentItemSelect }),
      client.consignmentItem.findMany({ where: { returnedAt: range }, select: consignmentItemSelect }),
      client.transfer.findMany({ where: { date: range }, select: transferSelect }),
      client.stockCount.findMany({ where: { startedAt: range }, select: stockCountSelect }),
    ]);
  return { supplierPayments, investorTxs, batchLines, stockLines, consignments, consignmentSold, consignmentReturned, transfers, stockCounts };
}

/** Maps every window row to a DayEvent and sorts newest first (ties: row id desc, then kind). */
export function buildEvents(win: DayWindow, extra: ExtraEventRows): DayEvent[] {
  const events = [
    ...win.sales.map(saleEvent),
    ...win.confirmedSales.map(saleConfirmedEvent),
    ...win.windowPayments.map(paymentEvent),
    ...win.windowReturns.map(returnEvent),
    ...win.ledger.map(ledgerEvent),
    ...win.walkInPurchases.map(walkInEvent),
    ...win.walkInPayouts.map(walkInPayoutEvent),
    ...extra.supplierPayments.map(supplierPaymentEvent),
    ...extra.investorTxs.map(investorEvent),
    ...batchEvents(extra.batchLines),
    ...extra.stockLines.map(stockEvent),
    ...extra.consignments.map(handoverEvent),
    ...extra.consignmentSold.map(consignmentSoldEvent),
    ...extra.consignmentReturned.map(consignmentReturnedEvent),
    ...extra.transfers.map(transferEvent),
    ...extra.stockCounts.map(stockCountEvent),
  ];
  return events.sort((a, b) => cmp(b.time, a.time) || idOf(b) - idOf(a) || cmp(a.kind, b.kind));
}

const cmp = (a: string, b: string) => (a < b ? -1 : +(a > b));
const idOf = (e: DayEvent) => Number(e.id.slice(e.id.indexOf(':') + 1));

/** Signed drawer/card effect as "+200.00" / "-150.00"; null when the effect is zero. */
export function signed(value: Prisma.Decimal, sign: 1 | -1): string | null {
  if (value.isZero()) return null;
  return `${sign > 0 ? '+' : '-'}${value.abs().toFixed(2)}`;
}

/** One event with every optional field defaulted to null. */
function event(kind: DayEventKind, rowId: number, time: Date, fields: Partial<DayEvent> & { title: string }): DayEvent {
  return {
    id: `${kind}:${rowId}`, kind, time: time.toISOString(), user: null, subtitle: null, count: null, fee: null, finished: null, method: null,
    amount: null, cash: null, card: null, refType: null, refId: null, ...fields,
  };
}

function saleEvent(s: WindowSale): DayEvent {
  return event('SALE', s.id, s.createdAt, { user: s.seller, title: `#${s.id}`, amount: s.total.toFixed(2), refType: 'SALE', refId: s.id });
}

/**
 * The Admin confirmed the sale (F33): the money taken before confirmation (cash net of cash refunds,
 * and card) enters the drawer now. Always emitted; cash/card are null when zero.
 */
function saleConfirmedEvent(s: ConfirmedSale): DayEvent {
  const confirmedAt = s.confirmedAt ?? new Date(0);
  const before = <T extends { createdAt: Date }>(rows: T[]) => rows.filter((r) => r.createdAt < confirmedAt);
  const { cash, card } = saleMoney(before(s.payments), before(s.returns));
  return event('SALE_CONFIRMED', s.id, confirmedAt, {
    user: s.confirmedBy, title: `#${s.id}`, subtitle: s.customer?.name ?? s.partner?.name ?? null,
    cash: signed(cash, cash.isNegative() ? -1 : 1), card: signed(card, 1), refType: 'SALE', refId: s.id,
  });
}

/** A payment moves the drawer at its own time only when its sale was already confirmed (F33). */
function paymentEvent(p: WindowPayment): DayEvent {
  const effect = countsAtOwnTime(p) ? signed(p.amount, 1) : null;
  const isCash = p.method === PaymentMethod.CASH;
  return event('PAYMENT', p.id, p.createdAt, {
    user: p.receiver, title: `#${p.saleId}`, method: p.method, amount: p.amount.toFixed(2),
    cash: isCash ? effect : null, card: isCash ? null : effect, refType: 'PAYMENT', refId: p.id,
  });
}

/** A cash refund leaves the drawer at its own time only when its sale was already confirmed (F33). */
function returnEvent(r: WindowReturn): DayEvent {
  return event('RETURN', r.id, r.createdAt, {
    user: r.user, title: `#${r.saleId}`, subtitle: [returnLabel(r), r.reason].filter(Boolean).join(' · '),
    amount: r.refundAmount.toFixed(2), cash: countsAtOwnTime(r) ? signed(r.cashRefund, -1) : null, refType: 'RETURN', refId: r.id,
  });
}

function ledgerEvent(l: WindowLedger): DayEvent {
  const isIncome = l.type === LedgerType.INCOME;
  // Only cash income and CONFIRMED cash expenses move the drawer (F27), matching computeExpected.
  const touchesDrawer = l.inCash && (isIncome || l.status === ExpenseStatus.CONFIRMED);
  const kind = isIncome ? 'INCOME' : 'EXPENSE';
  return event(kind, l.id, l.createdAt, {
    user: l.user, title: l.category, subtitle: l.note, amount: l.amount.toFixed(2),
    cash: touchesDrawer ? signed(l.amount, isIncome ? 1 : -1) : null, refType: kind, refId: l.id,
  });
}

/** The device was bought; informational only, the drawer moves when the payout is confirmed (F32). */
function walkInEvent(w: WindowWalkIn): DayEvent {
  return event('WALK_IN_PURCHASE', w.id, w.createdAt, {
    title: itemLabel(w.item?.productModel, w.item?.identifiers), subtitle: w.walkInSeller?.name ?? null,
    amount: lineTotal(w).toFixed(2),
  });
}

/** The Admin confirmed the seller was paid: the cash left the drawer at paidAt (F32). */
function walkInPayoutEvent(w: WindowWalkIn): DayEvent {
  const total = lineTotal(w);
  return event('WALK_IN_PAYOUT', w.id, w.paidAt ?? w.createdAt, {
    user: w.paidBy, title: itemLabel(w.item?.productModel, w.item?.identifiers), subtitle: w.walkInSeller?.name ?? null,
    amount: total.toFixed(2), cash: signed(total, -1),
  });
}

function supplierPaymentEvent(p: SupplierPaymentRow): DayEvent {
  return event('SUPPLIER_PAYMENT', p.id, p.date, {
    title: p.supplier.name, fee: p.fee.isZero() ? null : p.fee.toFixed(2), amount: p.amount.toFixed(2),
  });
}

function investorEvent(t: InvestorTxRow): DayEvent {
  const kind = t.type === InvestorTxType.DEPOSIT ? 'INVESTOR_DEPOSIT' : 'INVESTOR_PAYOUT';
  return event(kind, t.id, t.date, { title: t.investor.name, subtitle: t.note, amount: t.amount.toFixed(2) });
}

/** One BATCH_RECEIVED per batch: summed lines, timed at the latest line. */
function batchEvents(lines: BatchLineRow[]): DayEvent[] {
  const groups = new Map<number, { supplier: string; total: Prisma.Decimal; count: number; time: Date }>();
  for (const l of lines) {
    if (!l.batch) continue;
    const g = groups.get(l.batch.id) ?? { supplier: l.batch.supplier.name, total: new Prisma.Decimal(0), count: 0, time: l.createdAt };
    g.total = g.total.plus(lineTotal(l));
    g.count += l.quantity;
    if (l.createdAt > g.time) g.time = l.createdAt;
    groups.set(l.batch.id, g);
  }
  return [...groups].map(([id, g]) =>
    event('BATCH_RECEIVED', id, g.time, { title: g.supplier, count: g.count, amount: g.total.toFixed(2) }),
  );
}

function stockEvent(l: StockLineRow): DayEvent {
  return event('STOCK_RECEIVED', l.id, l.createdAt, {
    title: itemLabel(l.item?.productModel ?? l.productModel, undefined),
    subtitle: l.item?.identifiers[0]?.value ?? null,
    count: l.item ? null : l.quantity,
    amount: lineTotal(l).toFixed(2),
  });
}

function handoverEvent(c: ConsignmentRow): DayEvent {
  const total = c.items.reduce((s, i) => s.plus(i.minPrice), new Prisma.Decimal(0));
  return event('HANDOVER', c.id, c.date, { user: c.handedBy, title: c.partner.name, count: c.items.length, amount: total.toFixed(2) });
}

function consignmentSoldEvent(ci: ConsignmentItemRow): DayEvent {
  return event('CONSIGNMENT_SOLD', ci.id, ci.soldAt ?? new Date(0), {
    title: ci.consignment.partner.name, subtitle: itemLabel(ci.item.productModel, ci.item.identifiers),
    amount: (ci.saleItem?.unitPrice ?? ci.minPrice).toFixed(2),
  });
}

function consignmentReturnedEvent(ci: ConsignmentItemRow): DayEvent {
  return event('CONSIGNMENT_RETURNED', ci.id, ci.returnedAt ?? new Date(0), {
    title: ci.consignment.partner.name, subtitle: itemLabel(ci.item.productModel, ci.item.identifiers), amount: ci.minPrice.toFixed(2),
  });
}

function transferEvent(t: TransferRow): DayEvent {
  const { _count: count } = t;
  return event('TRANSFER', t.id, t.date, {
    user: t.user, title: `${t.fromLocation.name} → ${t.toLocation.name}`, count: count.items + count.accessories,
  });
}

function stockCountEvent(c: StockCountRow): DayEvent {
  return event('STOCK_COUNT', c.id, c.startedAt, { user: c.user, title: c.location.name, finished: c.finishedAt !== null });
}
