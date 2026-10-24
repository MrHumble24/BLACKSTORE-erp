import { formatMoney } from './formatMoney';

/**
 * Finance display currency. The app is currency-less by convention (formatMoney), but the finance
 * surfaces (reports, dashboard) show an explicit currency. Single source of truth — change to switch.
 */
export const CURRENCY = '$';

/** Full amount with the finance currency, e.g. "$2 625.00"; passes the em dash through for empty values. */
export function money(amount: string | number | null | undefined): string {
  const formatted = formatMoney(amount);
  return formatted === '—' ? formatted : `${CURRENCY}${formatted}`;
}

/** Positive decimal money string, optional integer part up to 2 decimals ("," accepted). */
export const POSITIVE_MONEY_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

/** Signed decimal money string (may start with "-"; "," accepted as decimal separator). */
export const SIGNED_MONEY_PATTERN = /^-?\d+(?:[.,]\d{1,2})?$/;

/** Normalizes a user-typed money string: trims whitespace and converts "," to ".". */
export function normalizeMoney(value: string): string {
  return value.trim().replace(',', '.');
}

/** True when the string looks like a non-zero money amount (sign allowed). */
export function isNonZeroMoney(value: string): boolean {
  const num = Number(normalizeMoney(value));
  return Number.isFinite(num) && num !== 0;
}

/** True when the string is money ≥ 0. */
export function isPositiveMoney(value: string): boolean {
  const num = Number(normalizeMoney(value));
  return Number.isFinite(num) && num >= 0;
}

/** True when the string is money > 0 (used for prices that must not be zero). */
export function isStrictlyPositiveMoney(value: string): boolean {
  const num = Number(normalizeMoney(value));
  return Number.isFinite(num) && num > 0;
}
