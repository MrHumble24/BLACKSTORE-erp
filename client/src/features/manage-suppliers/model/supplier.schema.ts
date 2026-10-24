import { z } from 'zod';
import { SIGNED_MONEY_PATTERN, isNonZeroMoney, normalizeMoney } from '@/shared/lib';

type TFn = (k: string) => string;

/** Form values for the supplier create/edit dialog. */
export interface SupplierFormValues {
  name: string;
  country: string;
  phone: string;
  note: string;
}

/** Localized Zod schema for the supplier form (only the name is required). */
export function createSupplierSchema(t: TFn) {
  return z.object({
    name: z.string().trim().min(1, { message: t('validation.nameRequired') }),
    country: z.string(),
    phone: z.string(),
    note: z.string(),
  });
}

/** Form values for the supplier payment dialog (amount may be a negative correction). */
export interface SupplierPaymentFormValues {
  amount: string;
  fee: string;
  date: string;
  note: string;
  /** Investor id as string; '' = the business's own money. */
  investorId: string;
  feePaidBy: 'BUSINESS' | 'INVESTOR';
}

/**
 * Localized Zod schema for a supplier payment: amount ≠ 0; fee is signed but may be negative only
 * on a correcting entry (negative amount), the same rule the server enforces.
 */
export function createSupplierPaymentSchema(t: TFn) {
  return z
    .object({
      amount: z
        .string()
        .min(1, { message: t('suppliers.validation.amountRequired') })
        .regex(SIGNED_MONEY_PATTERN, { message: t('suppliers.validation.amountInvalid') })
        .refine((v) => isNonZeroMoney(v), { message: t('suppliers.validation.amountNotZero') }),
      fee: z
        .string()
        .refine((v) => v.trim() === '' || SIGNED_MONEY_PATTERN.test(v.trim()), {
          message: t('suppliers.validation.feeInvalid'),
        }),
      date: z.string(),
      note: z.string(),
      investorId: z.string(),
      feePaidBy: z.enum(['BUSINESS', 'INVESTOR']),
    })
    .refine((v) => Number(normalizeMoney(v.fee)) >= 0 || Number(normalizeMoney(v.amount)) < 0, {
      message: t('suppliers.validation.feeNegativeOnlyOnCorrection'),
      path: ['fee'],
    })
    // A correction may not refund more fee than the amount it corrects (server mirrors this).
    .refine(
      (v) => {
        const fee = Number(normalizeMoney(v.fee));
        return fee >= 0 || Math.abs(fee) <= Math.abs(Number(normalizeMoney(v.amount)));
      },
      { message: t('suppliers.validation.feeCorrectionTooLarge'), path: ['fee'] },
    );
}
