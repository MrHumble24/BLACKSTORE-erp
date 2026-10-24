/** Decimal string with 1–10 integer digits and up to 2 decimals; fits Decimal(12,2) without overflow. */
export const MONEY_REGEX = /^\d{1,10}(\.\d{1,2})?$/;

/** Same as MONEY_REGEX but allows a leading minus: supplier correcting entries can be negative. */
export const SIGNED_MONEY_REGEX = /^-?\d{1,10}(\.\d{1,2})?$/;

/**
 * Display a decimal amount as `$1 500.00` — `$` prefix, 2 decimals, thousands grouped with a space.
 * Shared by every Telegram message (owner snapshot, customer receipts/reminders, investor reports)
 * so grouping matches the client's formatMoney, which treats "," as a decimal separator — hence the
 * space, not toLocaleString's comma. The separator is a non-breaking space (U+00A0) so the amount
 * never wraps mid-number in a Telegram message.
 */
export function money(amount: string): string {
  const [whole = '0', decimals = '00'] = Number(amount).toFixed(2).split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${decimals}`;
}
