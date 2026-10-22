import { z } from 'zod';
import type { CategoryAttribute } from '@/entities/category';
import { validateRequiredAttributes, type ItemCondition } from '@/entities/item';
import { POSITIVE_MONEY_PATTERN } from '@/shared/lib';
import type { CostSplitMethod } from '@/entities/batch';

type TFn = (k: string, options?: Record<string, unknown>) => string;

/** Form values for the batch create/edit dialog. */
export interface BatchFormValues {
  supplierId: number;
  investorId: number;
  locationId: number;
  arrivalDate: string;
  note: string;
  /** Edit-only fields (manage_prices). */
  extraCostTotal?: string;
  costSplitMethod?: CostSplitMethod;
}

/** Localized schema for the batch form; extra-cost fields validated only when visible. */
export function createBatchFormSchema(t: TFn, withCostFields: boolean) {
  return z
    .object({
      supplierId: z.number().min(1, t('batches.validation.supplierRequired')),
      investorId: z.number().min(1, t('items.validation.ownerRequired')),
      locationId: z.number().min(1, t('items.validation.locationRequired')),
      arrivalDate: z.string(),
      note: z.string(),
      extraCostTotal: z.string().optional(),
      costSplitMethod: z.enum(['NONE', 'EQUAL', 'BY_PRICE'] as const).optional(),
    })
    .superRefine((values, ctx) => {
      if (!withCostFields) return;
      const extra = values.extraCostTotal?.trim() ?? '';
      if (extra !== '' && !POSITIVE_MONEY_PATTERN.test(extra)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('batches.validation.extraCostInvalid'),
          path: ['extraCostTotal'],
        });
      }
    });
}

/** Form values for the batch scan panel: one model, condition and attributes for many scans. */
export interface BatchScanValues {
  categoryId: number;
  productModelId: number;
  condition: ItemCondition;
  purchasePrice?: string;
  attributes: Record<string, string | number>;
}

/** Localized schema for the batch scan panel (scan codes are validated at submit time). */
export function createBatchScanSchema(t: TFn, attributesList: CategoryAttribute[]) {
  return z
    .object({
      categoryId: z.number().min(1, t('items.validation.categoryRequired')),
      productModelId: z.number().min(1, t('items.validation.modelRequired')),
      condition: z.enum(['NEW', 'USED', 'REFURBISHED'] as const),
      purchasePrice: z.string().optional(),
      attributes: z.record(z.string(), z.union([z.string(), z.number()])),
    })
    .superRefine((values, ctx) => {
      validateRequiredAttributes(values.attributes, attributesList, ctx, t);
    });
}

/** Form values for adding an accessory line to a batch. */
export interface BatchAccessoryValues {
  categoryId: number;
  productModelId: number;
  quantity: string;
  unitCost?: string;
}

/** Localized schema: model required, quantity a positive integer, unit cost optional. */
export function createBatchAccessorySchema(t: TFn, withCostFields: boolean) {
  return z
    .object({
      categoryId: z.number().min(1, t('items.validation.categoryRequired')),
      productModelId: z.number().min(1, t('items.validation.modelRequired')),
      quantity: z
        .string()
        .refine((v) => /^\d+$/.test(v.trim()) && Number(v) > 0, {
          message: t('accessories.validation.quantityPositive'),
        }),
      unitCost: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (!withCostFields) return;
      const cost = values.unitCost?.trim() ?? '';
      if (cost !== '' && !POSITIVE_MONEY_PATTERN.test(cost)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('batches.validation.unitCostInvalid'),
          path: ['unitCost'],
        });
      }
    });
}

/** Form values for the line price dialog. */
export interface LinePriceValues {
  unitPrice: string;
}

/** Localized schema for the batch line unit price. */
export function createLinePriceSchema(t: TFn) {
  return z.object({
    unitPrice: z
      .string()
      .min(1, { message: t('batches.validation.unitPriceRequired') })
      .regex(POSITIVE_MONEY_PATTERN, { message: t('batches.validation.unitPriceInvalid') }),
  });
}
