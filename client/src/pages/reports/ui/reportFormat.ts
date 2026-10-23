import { formatMoney } from '@/shared/lib';

/**
 * Money formatting for the profit report. The rest of the app is currency-less by convention
 * (see formatMoney), but the finance dashboard shows an explicit currency so figures are unambiguous.
 */

/** Reports display currency. Single source of truth — change here to switch USD → so'm, etc. */
export const CURRENCY = '$';

/** Full amount with currency, e.g. "$2 625.00"; passes the em dash through for empty values. */
export function money(amount: string | number | null | undefined): string {
  const formatted = formatMoney(amount);
  return formatted === '—' ? formatted : `${CURRENCY}${formatted}`;
}

/** Compact money for chart axes and ticks, e.g. "$2.5k", "-$1.2M". */
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  let body: string;
  if (abs >= 1_000_000) body = `${trim(abs / 1_000_000)}M`;
  else if (abs >= 1_000) body = `${trim(abs / 1_000)}k`;
  else body = String(Math.round(abs));
  return `${sign}${CURRENCY}${body}`;
}

function trim(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
