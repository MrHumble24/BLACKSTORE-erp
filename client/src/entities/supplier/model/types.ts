/** Supplier summary shown in pick-lists and tables (manage_suppliers picks include phone | note). */
export interface SupplierSummary {
  id: number;
  name: string;
  country: string | null;
  isActive: boolean;
}

/** Full supplier with contact data and computed balance (BR-8); needs manage_suppliers. */
export interface Supplier extends SupplierSummary {
  phone: string | null;
  note: string | null;
  /** Balance renders only for view_cost users (absent otherwise, never null). */
  balance?: string;
}

/** Who bears the transfer fee: the business (default) or the investor whose money was sent. */
export type FeePayer = 'BUSINESS' | 'INVESTOR';

/** One payment (or negative correction) recorded for a supplier. */
export interface SupplierPayment {
  id: number;
  amount: string;
  /** Signed: negative only on a correcting entry. */
  fee: string;
  feePaidBy: FeePayer;
  date: string;
  note: string | null;
  /** Whose money was sent; null = the business's own money. */
  investor: { id: number; name: string } | null;
}

export interface CreateSupplierPayload {
  name: string;
  country?: string;
  phone?: string;
  note?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  country?: string;
  phone?: string;
  note?: string;
  isActive?: boolean;
}

export interface CreateSupplierPaymentPayload {
  /** Decimal string; may be negative for a correcting entry, never 0. */
  amount: string;
  fee?: string;
  date?: string;
  note?: string;
  investorId?: number;
  /** INVESTOR only together with investorId. */
  feePaidBy?: FeePayer;
}
