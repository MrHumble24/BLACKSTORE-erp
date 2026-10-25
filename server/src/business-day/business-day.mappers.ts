import { ConflictException } from '@nestjs/common';
import { DayStatus, Prisma } from '@prisma/client';
import { itemLabel } from '../common/item-brief';
import { PrismaService } from '../prisma/prisma.service';

/** Selects, window types and response mappers shared by the daily close service and the events feed (F13, F30). */

export type Tx = Prisma.TransactionClient;
export type DbClient = PrismaService | Tx;

export const userBrief = { select: { id: true, name: true } } as const;
export const itemNameSelect = {
  select: { productModel: { select: { name: true } }, identifiers: { select: { value: true }, orderBy: { id: 'asc' }, take: 1 } },
} as const;

// Window rows: everything the reconciliation (drawer math), the review lists and the events feed need in one pass.
// Payments and returns carry the sale's confirmedAt: they count at max(createdAt, confirmedAt) (F33).
const saleGate = { select: { confirmedAt: true } } as const;
export const paymentSelect = {
  id: true, amount: true, method: true, saleId: true, createdAt: true, receiver: userBrief, sale: saleGate,
} satisfies Prisma.SalePaymentSelect;
export const ledgerSelect = {
  id: true, category: true, amount: true, inCash: true, type: true, status: true, note: true, createdAt: true, user: userBrief,
} satisfies Prisma.LedgerEntrySelect;
export const saleSelect = {
  id: true, total: true, createdAt: true, seller: userBrief, confirmedAt: true, confirmedBy: userBrief,
} satisfies Prisma.SaleSelect;
// A sale waiting for confirmation (F33): its money so far, net of cash refunds, and who it was sold to.
export const pendingSaleSelect = {
  ...saleSelect,
  customer: { select: { name: true } },
  partner: { select: { name: true } },
  payments: { select: { amount: true, method: true } },
  returns: { select: { cashRefund: true } },
} satisfies Prisma.SaleSelect;
// A sale confirmed in the window: the money paid before confirmation lands at confirmedAt (SALE_CONFIRMED, F33).
export const confirmedSaleSelect = {
  id: true, confirmedAt: true, confirmedBy: userBrief, customer: { select: { name: true } }, partner: { select: { name: true } },
  payments: { select: { amount: true, method: true, createdAt: true } },
  returns: { select: { cashRefund: true, createdAt: true } },
} satisfies Prisma.SaleSelect;
export const returnSelect = {
  id: true,
  saleId: true,
  refundAmount: true,
  cashRefund: true,
  reason: true,
  createdAt: true,
  user: userBrief,
  sale: saleGate,
  saleItem: { select: { productModel: { select: { name: true } }, item: { select: { identifiers: { select: { value: true }, orderBy: { id: 'asc' }, take: 1 } } } } },
} satisfies Prisma.ReturnSelect;
// Walk-in lines: the price leaves the drawer once the payout is confirmed (W5, F32). No Item cost fields beyond the line itself.
export const walkInSelect = {
  id: true, unitPrice: true, quantity: true, createdAt: true, paidAt: true, paidBy: userBrief,
  walkInSeller: { select: { name: true } },
  item: itemNameSelect,
} satisfies Prisma.PurchaseLineSelect;

// Frozen snapshot fields returned for a closed day.
export const daySelect = {
  id: true, openedAt: true, closedAt: true, status: true, note: true,
  expectedCash: true, countedCash: true, cashVariance: true,
  expectedCard: true, countedCard: true, cardVariance: true,
  closedBy: userBrief,
} satisfies Prisma.BusinessDaySelect;

export type WindowPayment = Prisma.SalePaymentGetPayload<{ select: typeof paymentSelect }>;
export type WindowLedger = Prisma.LedgerEntryGetPayload<{ select: typeof ledgerSelect }>;
export type WindowSale = Prisma.SaleGetPayload<{ select: typeof saleSelect }>;
export type WindowReturn = Prisma.ReturnGetPayload<{ select: typeof returnSelect }>;
export type PendingSale = Prisma.SaleGetPayload<{ select: typeof pendingSaleSelect }>;
export type ConfirmedSale = Prisma.SaleGetPayload<{ select: typeof confirmedSaleSelect }>;
export type WindowWalkIn = Prisma.PurchaseLineGetPayload<{ select: typeof walkInSelect }>;
export type ClosedDay = Prisma.BusinessDayGetPayload<{ select: typeof daySelect }>;

/** Window rows the drawer math (computeExpected) needs; all close() loads. */
export interface DrawerWindow {
  payments: WindowPayment[]; // sale payments whose effective time is in the window (F33)
  ledger: WindowLedger[];
  returns: WindowReturn[]; // returns whose effective time is in the window (F33)
  walkInPayouts: WindowWalkIn[]; // payouts confirmed in the window (paidAt), subtracted from cash
}

/** Full open-day window for getCurrent: drawer rows plus the informational lists. */
export interface DayWindow extends DrawerWindow {
  windowPayments: WindowPayment[]; // recorded in the window (createdAt), confirmed or not: the feed
  windowReturns: WindowReturn[]; // recorded in the window (createdAt), confirmed or not: the feed + review list
  confirmedSales: ConfirmedSale[]; // confirmed in the window: SALE_CONFIRMED events
  sales: WindowSale[];
  walkInPurchases: WindowWalkIn[]; // bought in the window (createdAt), informational
  pendingWalkIn: { unitPrice: Prisma.Decimal; quantity: number }[]; // every unconfirmed walk-in line, any day
}

/**
 * Locks the OPEN BusinessDay row (SELECT ... FOR UPDATE) so close() and walk-in pay/unpay
 * serialize (F32): a payout can never fall between a close's snapshot and the next day's window.
 * Must be the first statement of the transaction.
 * retry (default, pay/unpay): a waiter whose day was just closed gets no row (READ COMMITTED re-checks
 * the locked row only); a second statement takes a fresh snapshot and finds the day the close opened.
 * retry: false (close): losing the race must NOT close the freshly opened day too, so no row is a 409.
 */
export async function lockOpenDay(tx: Tx, { retry = true } = {}): Promise<{ id: number; openedAt: Date }> {
  const lock = () => tx.$queryRaw<{ id: number }[]>`SELECT id FROM "BusinessDay" WHERE status = 'OPEN' FOR UPDATE`;
  let [row] = await lock();
  if (!row && retry) [row] = await lock();
  if (!row) throw new ConflictException(retry ? 'No open business day' : 'The day is already closed');
  return tx.businessDay.findUniqueOrThrow({ where: { id: row.id }, select: { id: true, openedAt: true } });
}

/** The OPEN day (id + start), or null when none is open; the partial unique index allows at most one. */
export function openDay(client: DbClient): Promise<{ id: number; openedAt: Date } | null> {
  return client.businessDay.findFirst({ where: { status: DayStatus.OPEN }, select: { id: true, openedAt: true } });
}

/** The OPEN day's start, or null when no day is open (sale confirmation undo window, F33). */
export async function openDayStart(client: DbClient): Promise<Date | null> {
  return (await openDay(client))?.openedAt ?? null;
}

/** Half-open window [openedAt, closedAt) as a Prisma DateTime filter. */
export function windowRange(openedAt: Date, closedAt?: Date): Prisma.DateTimeFilter {
  return { gte: openedAt, ...(closedAt ? { lt: closedAt } : {}) };
}

/** Human label for a returned sale line. */
export function returnLabel(r: WindowReturn): string {
  return itemLabel(r.saleItem.productModel, r.saleItem.item?.identifiers);
}

/** Return review row: a human label for the returned line plus the cash/debt split. */
export function toReturnRow(r: WindowReturn) {
  return { id: r.id, item: returnLabel(r), refundAmount: r.refundAmount.toFixed(2), cashRefund: r.cashRefund.toFixed(2), reason: r.reason, user: r.user };
}

/** Expense/income review row. */
export function toLedgerRow(l: WindowLedger) {
  return { id: l.id, category: l.category, amount: l.amount.toFixed(2), inCash: l.inCash };
}

/** Closed-day snapshot as decimal strings (frozen values, never recomputed). */
export function toDay(d: ClosedDay) {
  return {
    id: d.id,
    openedAt: d.openedAt.toISOString(),
    closedAt: d.closedAt?.toISOString() ?? null,
    status: d.status,
    note: d.note,
    closedBy: d.closedBy,
    expectedCash: d.expectedCash?.toFixed(2) ?? null,
    countedCash: d.countedCash?.toFixed(2) ?? null,
    cashVariance: d.cashVariance?.toFixed(2) ?? null,
    expectedCard: d.expectedCard?.toFixed(2) ?? null,
    countedCard: d.countedCard?.toFixed(2) ?? null,
    cardVariance: d.cardVariance?.toFixed(2) ?? null,
  };
}
