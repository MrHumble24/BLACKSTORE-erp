import { z } from 'zod';
import type { CategoryAttribute } from '@/entities/category';
import type { ItemFormValues } from '@/entities/item';
import { POSITIVE_MONEY_PATTERN } from '@/shared/lib';
import {
  validateIdentifiers,
  validateRequiredAttributes,
} from '@/entities/item';

type TFn = (k: string, options?: Record<string, unknown>) => string;

/**
 * Form values for the walk-in purchase form. Extends ItemFormValues so the shared
 * identifier/attribute inputs (and their RHF types) can be reused as-is.
 */
export interface WalkInPurchaseFormValues extends ItemFormValues {
  sellerName: string;
  sellerPhone: string;
  pricePaid: string;
}

/** Localized schema for a walk-in purchase: seller, item settings and the cash paid. */
export function createWalkInPurchaseSchema(t: TFn, attributesList: CategoryAttribute[]) {
  return z
    .object({
      sellerName: z.string().trim().min(1, { message: t('walkIn.validation.sellerNameRequired') }),
      sellerPhone: z.string().trim().min(1, { message: t('walkIn.validation.sellerPhoneRequired') }),
      categoryId: z.number().min(1, t('items.validation.categoryRequired')),
      productModelId: z.number().min(1, t('items.validation.modelRequired')),
      investorId: z.number().min(1, t('items.validation.ownerRequired')),
      locationId: z.number().min(1, t('items.validation.locationRequired')),
      condition: z.enum(['NEW', 'USED', 'REFURBISHED'] as const),
      imei: z.string(),
      imei2: z.string(),
      serial: z.string(),
      attributes: z.record(z.string(), z.union([z.string(), z.number()])),
      pricePaid: z
        .string()
        .min(1, { message: t('walkIn.validation.pricePaidRequired') })
        .regex(POSITIVE_MONEY_PATTERN, { message: t('walkIn.validation.pricePaidInvalid') }),
    })
    .superRefine((values, ctx) => {
      validateIdentifiers(values, ctx, t);
      validateRequiredAttributes(values.attributes, attributesList, ctx, t);
    });
}
