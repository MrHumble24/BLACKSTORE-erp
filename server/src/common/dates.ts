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
