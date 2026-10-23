/** Basic partner contact record. */
export interface Partner {
  id: number;
  name: string;
  phone: string;
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
  phone: string;
  marketLocation?: string;
  note?: string;
}

/** Payload for updating an existing partner. */
export interface UpdatePartnerPayload {
  name?: string;
  phone?: string;
  marketLocation?: string;
  note?: string;
}
