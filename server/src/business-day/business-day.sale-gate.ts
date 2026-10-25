import { PaymentMethod, Prisma } from '@prisma/client';
import { DbClient, paymentSelect, PendingSale, pendingSaleSelect, returnSelect, WindowPayment, WindowReturn, windowRange } from './business-day.mappers';

/**
 * Sale confirmation drawer gate (F33): a sale payment or cash refund counts in the drawer at its
 * effective time = max(createdAt, sale.confirmedAt), and never while the sale is unconfirmed.
 * So money taken before confirmation lands at the confirmation; money after it lands at its own time.
 */

type Gated = { createdAt: Date; sale: { confirmedAt: Date | null } };

/** True when the row's effective time is in [openedAt, closedAt); a tie with confirmedAt counts as after it. */
export function countsInWindow(row: Gated, openedAt: Date, closedAt?: Date): boolean {
  const { confirmedAt } = row.sale;
  if (!confirmedAt) return false;
  const effective = row.createdAt >= confirmedAt ? row.createdAt : confirmedAt;
  return effective >= openedAt && (!closedAt || effective < closedAt);
}

/** True when the row moved the drawer at its own time (sale already confirmed); the feed's PAYMENT/RETURN effect. */
export function countsAtOwnTime(row: Gated): boolean {
  return row.sale.confirmedAt !== null && row.createdAt >= row.sale.confirmedAt;
}

/** Payments and returns that may count in the window: recorded in it, or their sale confirmed in it. */
export async function loadSaleMoney(client: DbClient, openedAt: Date, closedAt?: Date) {
  const range = windowRange(openedAt, closedAt);
  const where = { OR: [{ createdAt: range }, { sale: { confirmedAt: range } }] };
  const [payments, returns] = await Promise.all([
    client.salePayment.findMany({ where, select: paymentSelect }),
    client.return.findMany({ where, select: returnSelect, orderBy: { id: 'desc' } }),
  ]);
  return { payments, returns };
}

/** A confirmation can be undone only while it lies inside the OPEN day; a close freezes it (F33). */
export function canUndoConfirmation(confirmedAt: Date | null, openedAt: Date | null): boolean {
  return confirmedAt !== null && openedAt !== null && confirmedAt >= openedAt;
}

/** A sale's drawer money: cash net of cash refunds, and card (no card-refund path in v1). */
export function saleMoney(
  payments: { amount: Prisma.Decimal; method: PaymentMethod }[],
  returns: { cashRefund: Prisma.Decimal }[],
) {
  const sum = (method: PaymentMethod) => payments.reduce((t, p) => (p.method === method ? t.plus(p.amount) : t), new Prisma.Decimal(0));
  const refunded = returns.reduce((t, r) => t.plus(r.cashRefund), new Prisma.Decimal(0));
  return { cash: sum(PaymentMethod.CASH).minus(refunded), card: sum(PaymentMethod.CARD) };
}

/**
 * Every unconfirmed sale (any day): the oldest 200 rows, the total count and the waiting money
 * (pendingSalesCash / pendingSalesCard), summed in the database so no payment rows are loaded.
 */
export async function loadPendingSales(client: DbClient) {
  const where = { sale: { confirmedAt: null } };
  const [rows, count, byMethod, { _sum: refunded }] = await Promise.all([
    client.sale.findMany({ where: { confirmedAt: null }, select: pendingSaleSelect, orderBy: { createdAt: 'asc' }, take: 200 }),
    client.sale.count({ where: { confirmedAt: null } }),
    client.salePayment.groupBy({ by: ['method'], where, _sum: { amount: true } }),
    client.return.aggregate({ where, _sum: { cashRefund: true } }),
  ]);
  const zero = new Prisma.Decimal(0);
  const money = saleMoney(
    byMethod.map(({ method, _sum }) => ({ method, amount: _sum.amount ?? zero })),
    [{ cashRefund: refunded.cashRefund ?? zero }],
  );
  return { rows, count, cash: money.cash, card: money.card };
}

/** Open-day sale row (F13 review list): who sold it, the total and its confirmation state. */
export function toSaleRow(s: Omit<PendingSale, 'customer' | 'partner' | 'payments' | 'returns'>) {
  return {
    id: s.id, seller: s.seller, total: s.total.toFixed(2), time: s.createdAt.toISOString(),
    confirmedAt: s.confirmedAt?.toISOString() ?? null, confirmedBy: s.confirmedBy,
  };
}

/** Waiting sale row: the sale row plus its money so far (cash net of cash refunds) and the buyer's name. */
export function toPendingSaleRow(s: PendingSale) {
  const { cash, card } = saleMoney(s.payments, s.returns);
  return {
    ...toSaleRow(s),
    paidCash: cash.toFixed(2),
    paidCard: card.toFixed(2),
    party: s.customer?.name ?? s.partner?.name ?? null,
  };
}

/** Splits loaded sale money into the drawer rows (effective time in window) and the feed rows (recorded in window). */
export function splitSaleMoney(
  loaded: { payments: WindowPayment[]; returns: WindowReturn[] },
  openedAt: Date,
  closedAt?: Date,
) {
  const counted = <T extends Gated>(rows: T[]) => rows.filter((r) => countsInWindow(r, openedAt, closedAt));
  const recorded = <T extends Gated>(rows: T[]) => rows.filter((r) => r.createdAt >= openedAt && (!closedAt || r.createdAt < closedAt));
  return {
    payments: counted(loaded.payments),
    returns: counted(loaded.returns),
    windowPayments: recorded(loaded.payments),
    windowReturns: recorded(loaded.returns),
  };
}
