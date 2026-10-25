/** Daily close / reconciliation types (F13). Mirrors the server's decimal-string money contract. */

export type FlagRefType = 'SALE' | 'PAYMENT' | 'RETURN' | 'EXPENSE' | 'INCOME';

/** A user reference (seller / actor) as returned by the review lists. */
export interface NamedRef {
  id: number;
  name: string;
}

/** A sale made during the open day, awaiting the owner's reconciliation. */
export interface OpenDaySaleRow {
  id: number;
  seller: NamedRef | null;
  total: string;
  time: string;
}

/** A return in the window: how much was refunded and how much of it was cash out of the drawer. */
export interface OpenDayReturnRow {
  id: number;
  item: string;
  refundAmount: string;
  cashRefund: string;
  reason: string;
  user: NamedRef | null;
}

/** An expense or income entry in the window; inCash marks the cash drawer vs bank/card. */
export interface OpenDayLedgerRow {
  id: number;
  category: string;
  amount: string;
  inCash: boolean;
}

/** GET /business-day/current — the open day plus live expected totals and review lists. */
export interface CurrentBusinessDay {
  day: { id: number; openedAt: string };
  expectedCash: string;
  expectedCard: string;
  payments: { cash: string; card: string };
  sales: OpenDaySaleRow[];
  returns: OpenDayReturnRow[];
  expenses: OpenDayLedgerRow[];
  income: OpenDayLedgerRow[];
}

/** One suspicious record the owner flags while closing (audited server-side). */
export interface DayCloseFlagInput {
  refType: FlagRefType;
  refId: number;
  reason: string;
}

/** POST /business-day/close body: the owner's counted drawer totals plus optional flags/note. */
export interface CloseDayPayload {
  countedCash: string;
  countedCard: string;
  flags?: DayCloseFlagInput[];
  note?: string;
}

/** The frozen snapshot returned once a day is closed (variances computed server-side). */
export interface ClosedDaySnapshot {
  id: number;
  openedAt: string;
  closedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  note: string | null;
  closedBy: NamedRef | null;
  expectedCash: string | null;
  countedCash: string | null;
  cashVariance: string | null;
  expectedCard: string | null;
  countedCard: string | null;
  cardVariance: string | null;
}

/** PATCH /business-day/:id body: corrects what was counted at close; expected values stay frozen. */
export interface UpdateBusinessDayPayload {
  countedCash?: string;
  countedCard?: string;
  note?: string | null;
}
