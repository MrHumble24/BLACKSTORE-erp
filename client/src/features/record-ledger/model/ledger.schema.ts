import { z } from 'zod';
import { POSITIVE_MONEY_PATTERN, normalizeMoney } from '@/shared/lib';

type TFn = (k: string) => string;

/** Form values for the ledger entry dialog. */
export interface LedgerFormValues {
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: string;
  date: string;
  note: string;
  countsInProfit: boolean;
}

/** Localized schema: category 1–50 chars, amount a positive money string. */
export function createLedgerSchema(t: TFn) {
  return z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z
      .string()
      .trim()
      .min(1, { message: t('ledger.validation.categoryRequired') })
      .max(50, { message: t('ledger.validation.categoryMax') }),
    amount: z
      .string()
      .min(1, { message: t('ledger.validation.amountRequired') })
      .regex(POSITIVE_MONEY_PATTERN, { message: t('ledger.validation.amountInvalid') })
      .refine((v) => Number(normalizeMoney(v)) > 0, { message: t('ledger.validation.amountPositive') }),
    date: z.string(),
    note: z.string(),
    countsInProfit: z.boolean(),
  });
}
