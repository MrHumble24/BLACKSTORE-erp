import { BadRequestException } from '@nestjs/common';

/** Parses an ISO date string, rejecting a NaN result. Shared by the date helpers below. */
function parseIso(iso: string): Date {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
  return date;
}

/**
 * Parses an optional ISO date string and rejects future dates (arrival dates and
 * payment dates can only be now or in the past). Returns undefined when absent so
 * Prisma falls back to the column's `now()` default.
 */
export function parsePastDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const date = parseIso(iso);
  if (date.getTime() > Date.now()) {
    throw new BadRequestException('Date cannot be in the future');
  }
  return date;
}

/**
 * Parses an optional ISO date and rejects dates before today (debt due dates can
 * only be today or later). Returns undefined when absent.
 */
export function parseTodayOrFutureDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const date = parseIso(iso);
  if (date.getTime() < startOfToday().getTime()) {
    throw new BadRequestException('Date cannot be in the past');
  }
  return date;
}

/** Start (local midnight) of the current day; used for due-date and overdue checks. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the last millisecond of the given day (an ISO string or a Date), so a `to`
 * filter includes everything that happened on that day. Callers guard the absent case.
 */
export function endOfDay(day: string | Date): Date {
  const date = typeof day === 'string' ? parseIso(day) : new Date(day);
  date.setHours(23, 59, 59, 999);
  return date;
}

/** `24.10.2026` — day.month.year, the display format every finance/Telegram surface uses. */
export function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Builds an inclusive `{ gte, lte }` date filter from optional `from`/`to`, or undefined when both absent. */
export function dateRange(
  from: string | undefined,
  to: string | undefined,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  return { gte: from ? new Date(from) : undefined, lte: to ? endOfDay(to) : undefined };
}
