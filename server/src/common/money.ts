/** Decimal string with 1–10 integer digits and up to 2 decimals; fits Decimal(12,2) without overflow. */
export const MONEY_REGEX = /^\d{1,10}(\.\d{1,2})?$/;

/** Same as MONEY_REGEX but allows a leading minus: supplier correcting entries can be negative. */
export const SIGNED_MONEY_REGEX = /^-?\d{1,10}(\.\d{1,2})?$/;
