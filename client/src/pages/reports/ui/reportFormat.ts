import { CURRENCY, money } from '@/shared/lib';

/** Report money helpers. CURRENCY/money live in shared/lib (also used by the home dashboard). */
export { CURRENCY, money };

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
