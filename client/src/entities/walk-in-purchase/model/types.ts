/** Walk-in purchase payout types (F32). Money is a decimal string, as everywhere in the API. */

/** One walk-in purchase line and its payout state; paidAt null = the seller has not been paid yet. */
export interface WalkInPayoutRow {
  lineId: number;
  /** When the device was bought. */
  createdAt: string;
  amount: string;
  seller: { name: string; phone: string };
  item: { id: number; model: string; identifier: string | null } | null;
  paidAt: string | null;
  paidBy: { id: number; name: string } | null;
}
