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
  /** When the sale was confirmed (F33); null = still waiting, its money not counted yet. */
  confirmedAt: string | null;
  confirmedBy: NamedRef | null;
}

/** An unconfirmed sale from any day, with its money net of cash refunds (F33). */
export interface PendingSaleRow extends OpenDaySaleRow {
  paidCash: string;
  paidCard: string;
  /** Customer or partner name; null for a walk-in customer. */
  party: string | null;
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

/** Every kind of record the day's events feed can show (F30). */
export type DayEventKind =
  | 'SALE' | 'PAYMENT' | 'RETURN' | 'EXPENSE' | 'INCOME' | 'WALK_IN_PURCHASE' | 'WALK_IN_PAYOUT'
  | 'SUPPLIER_PAYMENT' | 'INVESTOR_DEPOSIT' | 'INVESTOR_PAYOUT' | 'BATCH_RECEIVED'
  | 'STOCK_RECEIVED' | 'HANDOVER' | 'CONSIGNMENT_SOLD' | 'CONSIGNMENT_RETURNED' | 'TRANSFER' | 'STOCK_COUNT' | 'SALE_CONFIRMED';

/** One row of the open day's chronological feed; title/subtitle are raw data, the client translates the structured fields. */
export interface DayEvent {
  id: string;
  kind: DayEventKind;
  time: string;
  user: NamedRef | null;
  title: string;
  subtitle: string | null;
  amount: string | null;
  /** Signed drawer effect ("-150.00", "+200.00"); null = no effect. */
  cash: string | null;
  /** Signed card effect (card payments only); null = no effect. */
  card: string | null;
  /** Payment method for money events; null when not a payment. */
  method: 'CASH' | 'CARD' | null;
  /** Number of items (batches, handovers, transfers); null when not applicable. */
  count: number | null;
  /** Card/transfer fee as a decimal string; null when none. */
  fee: string | null;
  /** Stock count state; null when the event is not a stock count. */
  finished: boolean | null;
  refType: FlagRefType | null;
  refId: number | null;
}

/** How expected cash is built: paymentsCash + cashIncome − cashExpense − cashRefunds − walkInPurchases. */
export interface CashBreakdown {
  /** Cash payments of confirmed sales counted in this day window. */
  paymentsCash: string;
  /** Card payments of confirmed sales counted in this day window. */
  paymentsCard: string;
  cashIncome: string;
  cashExpense: string;
  cashRefunds: string;
  /** Walk-in payouts confirmed in this day window (subtracted). */
  walkInPurchases: string;
  /** All unconfirmed walk-in lines, any day; shown only, never subtracted. */
  pendingWalkInPurchases: string;
  /** Cash of unconfirmed sales, any day; shown only, never counted (F33). */
  pendingSalesCash: string;
  /** Card of unconfirmed sales, any day; shown only, never counted (F33). */
  pendingSalesCard: string;
}

/** GET /business-day/current — the open day plus live expected totals, review lists and events. */
export interface CurrentBusinessDay {
  day: { id: number; openedAt: string };
  expectedCash: string;
  expectedCard: string;
  payments: { cash: string; card: string };
  breakdown: CashBreakdown;
  sales: OpenDaySaleRow[];
  /** Every unconfirmed sale, oldest first, capped at 200 rows. */
  pendingSales: PendingSaleRow[];
  /** Total unconfirmed sales (may exceed the listed rows). */
  pendingSalesCount: number;
  returns: OpenDayReturnRow[];
  expenses: OpenDayLedgerRow[];
  income: OpenDayLedgerRow[];
  /** Newest first, the whole day window. */
  events: DayEvent[];
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
