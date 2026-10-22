import { z } from 'zod';
import { SCAN_CODE_REGEX, IMEI_REGEX, type IdentifierType } from '@/entities/item';

export interface AddIdentifierValues {
  type: IdentifierType;
  value: string;
}

/** Localized Zod schema for adding one identifier to an existing item. */
export function createAddIdentifierSchema(t: (k: string) => string) {
  return z
    .object({
      type: z.enum(['IMEI', 'SERIAL', 'SYSTEM_CODE'] as const),
      value: z.string().min(1, t('items.validation.valueRequired')),
    })
    .superRefine((data, ctx) => {
      const val = data.value.trim();
      if (data.type === 'IMEI' && !IMEI_REGEX.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('items.validation.invalidImei'),
          path: ['value'],
        });
      }
      if (
        (data.type === 'SERIAL' || data.type === 'SYSTEM_CODE') &&
        !SCAN_CODE_REGEX.test(val)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('items.validation.invalidSerial'),
          path: ['value'],
        });
      }
    });
}
