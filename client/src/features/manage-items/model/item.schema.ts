import { z } from 'zod';
import type { CategoryAttribute } from '@/entities/category';
import {
  type ItemCondition,
  type IdentifierType,
  SCAN_CODE_REGEX,
  IMEI_REGEX,
} from '@/entities/item';

export interface ItemFormValues {
  categoryId: number;
  productModelId: number;
  investorId: number;
  locationId: number;
  condition: ItemCondition;
  imei: string;
  imei2: string;
  serial: string;
  attributes: Record<string, string | number>;
  purchasePrice?: string;
  salePrice?: string;
  minSalePrice?: string;
}

function validateIdentifiers(
  data: { imei: string; imei2: string; serial: string },
  ctx: z.RefinementCtx,
  t: (k: string) => string,
) {
  const imei = data.imei.trim();
  const imei2 = data.imei2.trim();
  const serial = data.serial.trim();

  if (!imei && !serial) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('items.validation.atLeastOneIdentifier'), path: ['imei'] });
  }
  if (imei && !IMEI_REGEX.test(imei)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('items.validation.invalidImei'), path: ['imei'] });
  }
  if (imei2 && !IMEI_REGEX.test(imei2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('items.validation.invalidImei2'), path: ['imei2'] });
  }
  if (serial && !SCAN_CODE_REGEX.test(serial)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('items.validation.invalidSerial'), path: ['serial'] });
  }
}

function validateRequiredAttributes(
  attributes: Record<string, string | number>,
  attributesList: CategoryAttribute[],
  ctx: z.RefinementCtx,
  t: (k: string, options?: Record<string, unknown>) => string,
) {
  for (const attr of attributesList) {
    if (attr.required) {
      const val = attributes[attr.key];
      if (val === undefined || val === null || String(val).trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('items.validation.attributeRequired', { label: attr.label }),
          path: ['attributes', attr.key],
        });
      }
    }
  }
}

export function createItemValidationSchema(
  attributesList: CategoryAttribute[],
  t: (k: string, options?: Record<string, unknown>) => string,
) {
  return z
    .object({
      categoryId: z.number().min(1, t('items.validation.categoryRequired')),
      productModelId: z.number().min(1, t('items.validation.modelRequired')),
      investorId: z.number().min(1, t('items.validation.ownerRequired')),
      locationId: z.number().min(1, t('items.validation.locationRequired')),
      condition: z.enum(['NEW', 'USED', 'REFURBISHED'] as const),
      imei: z.string(),
      imei2: z.string(),
      serial: z.string(),
      attributes: z.record(z.string(), z.union([z.string(), z.number()])),
      purchasePrice: z.string().optional(),
      salePrice: z.string().optional(),
      minSalePrice: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      validateIdentifiers(data, ctx, t);
      validateRequiredAttributes(data.attributes, attributesList, ctx, t);
    });
}

export interface AddIdentifierValues {
  type: IdentifierType;
  value: string;
}

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
