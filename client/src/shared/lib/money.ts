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
