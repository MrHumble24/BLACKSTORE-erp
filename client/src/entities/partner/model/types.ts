/** Basic partner contact record. */
export interface Partner {
  id: number;
  name: string;
  phone: string | null;
  marketLocation: string | null;
  note: string | null;
}

/** Partner report aggregating held items, debts and overdue count. */
export interface PartnerReport extends Partner {
  held: number;
  soldUnpaid: number;
  totalOwed: string;
  overdue: number;
}

/** Payload for creating a new partner. */
export interface CreatePartnerPayload {
  name: string;
  phone?: string;
  marketLocation?: string;
  note?: string;
}

/** Payload for updating an existing partner. */
export interface UpdatePartnerPayload {
  name?: string;
  phone?: string | null;
  marketLocation?: string;
  note?: string;
}

/** The five partner events shown in the transactions feed (F29). */
export type PartnerTransactionKind = 'HANDOVER' | 'SOLD' | 'RETURNED' | 'PAYMENT' | 'REFUND';

/** One event in the partner transactions feed; amounts are min/sale prices, payments or refunds, never cost. */
export interface PartnerTransaction {
  /** `${kind}:${sourceRowId}`, unique in the feed. */
  id: string;
  kind: PartnerTransactionKind;
  date: string;
  partner: { id: number; name: string };
  user: { id: number; name: string } | null;
  /** Model name or identifier for SOLD / RETURNED / REFUND; null for HANDOVER / PAYMENT. */
  item: string | null;
  /** Items handed over for HANDOVER; otherwise 1. */
  count: number;
  amount: string;
  method: 'CASH' | 'CARD' | null;
  saleId: number | null;
  consignmentId: number | null;
}

/** A page of the transactions feed plus totals over the whole range (not just the page). */
export interface PartnerTransactionsPage {
  items: PartnerTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totals: { handedOver: string; sold: string; returned: string; paid: string; refunded: string };
}

/** Feed range as full ISO timestamps (local day boundaries computed by the client). */
export interface PartnerTransactionsFilters {
  from: string;
  to: string;
}
