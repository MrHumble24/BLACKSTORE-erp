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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (date.getTime() < startOfToday.getTime()) {
    throw new BadRequestException('Date cannot be in the past');
  }
  return date;
}

/**
 * Returns the last millisecond of the given ISO date's day, so a `to` filter
 * includes everything that happened on that day. Callers guard the absent case.
 */
export function endOfDay(iso: string): Date {
  const date = parseIso(iso);
  date.setHours(23, 59, 59, 999);
  return date;
}

/** Builds an inclusive `{ gte, lte }` date filter from optional `from`/`to`, or undefined when both absent. */
export function dateRange(
  from: string | undefined,
  to: string | undefined,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  return { gte: from ? new Date(from) : undefined, lte: to ? endOfDay(to) : undefined };
}
