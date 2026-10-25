import { z } from 'zod';
import { POSITIVE_MONEY_PATTERN } from '@/shared/lib';

type TFn = (k: string) => string;

/** Max note length, matching the server DTO. */
export const NOTE_MAX = 500;

/** Form values for correcting a closed day: the two counted totals and the note. */
export interface EditClosedDayValues {
  countedCash: string;
  countedCard: string;
  note: string;
}

/** Localized schema: both counts are required money strings (≥ 0), note up to 500 chars. */
export function createEditClosedDaySchema(t: TFn) {
  const money = z
    .string()
    .trim()
    .min(1, { message: t('ledger.validation.amountRequired') })
    .regex(POSITIVE_MONEY_PATTERN, { message: t('ledger.validation.amountInvalid') });
  return z.object({ countedCash: money, countedCard: money, note: z.string().max(NOTE_MAX) });
}
