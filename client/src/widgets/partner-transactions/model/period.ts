import type { PartnerTransactionsFilters } from '@/entities/partner';

/** Feed period preset; "week" runs from Monday of the current week to today. */
export type Period = 'today' | 'week' | 'custom';

/** The two `YYYY-MM-DD` values from the custom date inputs. */
export interface CustomRange {
  from?: string;
  to?: string;
}

/** Parses `YYYY-MM-DD` as a local calendar day (new Date('YYYY-MM-DD') would be UTC midnight). */
function parseLocalDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Local 00:00:00.000 of the first day → local 23:59:59.999 of the last day, as ISO timestamps. */
function dayBounds(first: Date, last: Date): PartnerTransactionsFilters {
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const to = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Turns a period into the `{ from, to }` range sent to the server, using the browser's local day,
 * so "today" is the user's day rather than the server's. `now` is injectable for tests.
 */
export function rangeFor(period: Period, custom: CustomRange, now = new Date()): PartnerTransactionsFilters {
  if (period === 'week') {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return dayBounds(monday, now);
  }
  if (period === 'custom' && (custom.from || custom.to)) {
    // One date set → use it for both ends; swap a reversed range so the server never gets from > to.
    const [first, last] = [custom.from || custom.to || '', custom.to || custom.from || ''].sort();
    return dayBounds(parseLocalDay(first), parseLocalDay(last));
  }
  return dayBounds(now, now);
}
