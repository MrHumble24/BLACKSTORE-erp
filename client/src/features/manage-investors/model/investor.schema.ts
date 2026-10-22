import { z } from 'zod';

type TFn = (key: string) => string;

/** Money-like amount string: digits with an optional 2-decimal part; sent as typed (no float math). */
const AMOUNT_PATTERN = /^\d+([.,]\d{1,2})?$/;

/** Creates a localized Zod schema for the investor form with the contract's shareValue rules
 * (PERCENT → 0–100; FIXED_PER_ITEM → ≥ 0; NONE → value hidden and not sent). */
export function createInvestorSchema(t: TFn) {
  return z
    .object({
      name: z.string().trim().min(1, { message: t('validation.nameRequired') }),
      code: z.string().trim().min(1, { message: t('investors.validation.codeRequired') }),
      shareType: z.enum(['NONE', 'PERCENT', 'FIXED_PER_ITEM'], {
        message: t('investors.validation.shareTypeRequired'),
      }),
      shareValue: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.shareType === 'NONE') {
        return;
      }
      if (!AMOUNT_PATTERN.test(values.shareValue)) {
        ctx.addIssue({
          code: 'custom',
          path: ['shareValue'],
          message: t('investors.validation.amountInvalid'),
        });
        return;
      }
      const share = Number(values.shareValue.replace(',', '.'));
      if (values.shareType === 'PERCENT' && (share < 0 || share > 100)) {
        ctx.addIssue({
          code: 'custom',
          path: ['shareValue'],
          message: t('investors.validation.sharePercentRange'),
        });
      }
      if (values.shareType === 'FIXED_PER_ITEM' && share < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['shareValue'],
          message: t('investors.validation.shareFixedMin'),
        });
      }
    });
}

export type InvestorFormValues = z.infer<ReturnType<typeof createInvestorSchema>>;

/** Creates a localized Zod schema for a deposit/payout transaction (amount > 0, date optional). */
export function createInvestorTransactionSchema(t: TFn) {
  return z.object({
    type: z.enum(['DEPOSIT', 'PAYOUT'], {
      message: t('investors.validation.transactionTypeRequired'),
    }),
    amount: z
      .string()
      .min(1, { message: t('investors.validation.amountRequired') })
      .regex(AMOUNT_PATTERN, { message: t('investors.validation.amountInvalid') })
      .refine((v) => Number(v.replace(',', '.')) > 0, {
        message: t('investors.validation.amountPositive'),
      }),
    date: z.string(),
    note: z.string(),
  });
}

export type InvestorTransactionFormValues = z.infer<
  ReturnType<typeof createInvestorTransactionSchema>
>;
