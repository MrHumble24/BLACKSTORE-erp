import { z } from 'zod';
import { SIGNED_MONEY_PATTERN, isNonZeroMoney, isPositiveMoney } from '@/shared/lib';

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
}

/** Localized Zod schema for a supplier payment: amount ≠ 0, fee ≥ 0. */
export function createSupplierPaymentSchema(t: TFn) {
  return z.object({
    amount: z
      .string()
      .min(1, { message: t('suppliers.validation.amountRequired') })
      .regex(SIGNED_MONEY_PATTERN, { message: t('suppliers.validation.amountInvalid') })
      .refine((v) => isNonZeroMoney(v), { message: t('suppliers.validation.amountNotZero') }),
    fee: z
      .string()
      .refine((v) => v.trim() === '' || isPositiveMoney(v), {
        message: t('suppliers.validation.feeInvalid'),
      }),
    date: z.string(),
    note: z.string(),
  });
}
