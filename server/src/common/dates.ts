import { BadRequestException } from '@nestjs/common';

/**
 * Parses an optional ISO date string and rejects future dates (arrival dates and
 * payment dates can only be now or in the past). Returns undefined when absent so
 * Prisma falls back to the column's `now()` default.
 */
export function parsePastDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  // Defense-in-depth: @IsISO8601 already blocks this at the DTO, but reject NaN dates anyway.
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Date is not a valid ISO-8601 value');
  }
  if (date.getTime() > Date.now()) {
    throw new BadRequestException('Date cannot be in the future');
  }
  return date;
}

/** Parses an ISO date and pushes it to the last millisecond of that day, so a `to` bound is inclusive. */
export function endOfDay(iso: string): Date {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
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
