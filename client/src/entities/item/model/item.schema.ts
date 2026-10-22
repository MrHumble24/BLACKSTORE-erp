import { z } from 'zod';
import type { CategoryAttribute } from '@/entities/category';
import { SCAN_CODE_REGEX, IMEI_REGEX, type ItemCondition } from './types';

/** Form field values for creating or editing a device item (identifiers are raw strings). */
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

/** One to-be-sent identifier payload ({ type, value }). */
export interface NewIdentifier {
  type: 'IMEI' | 'SERIAL' | 'SYSTEM_CODE';
  value: string;
}

type TFn = (k: string, options?: Record<string, unknown>) => string;

/** Validates IMEI 1/2 and serial strings against the contract's identifier rules. */
export function validateIdentifiers(
  data: { imei: string; imei2: string; serial: string },
  ctx: z.RefinementCtx,
  t: TFn,
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

/** Validates required attributes of the selected category are present. */
export function validateRequiredAttributes(
  attributes: Record<string, string | number>,
  attributesList: CategoryAttribute[],
  ctx: z.RefinementCtx,
  t: TFn,
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

/** Localized Zod schema for the full item create/edit form (identifiers + attributes). */
export function createItemValidationSchema(
  attributesList: CategoryAttribute[],
  t: TFn,
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

/** Maps raw form identifier strings into { type, value } payloads (trimmed, upper-cased). */
export function buildIdentifiers(
  values: { imei: string; imei2: string; serial: string },
): NewIdentifier[] {
  const identifiers: NewIdentifier[] = [];
  if (values.imei.trim()) {
    identifiers.push({ type: 'IMEI', value: values.imei.trim().toUpperCase() });
  }
  if (values.imei2.trim()) {
    identifiers.push({ type: 'IMEI', value: values.imei2.trim().toUpperCase() });
  }
  if (values.serial.trim()) {
    identifiers.push({ type: 'SERIAL', value: values.serial.trim().toUpperCase() });
  }
  return identifiers;
}

/** Drops empty attribute entries and casts NUMBER attributes to numbers per the contract. */
export function formatAttributes(
  raw: Record<string, string | number>,
  definitions: CategoryAttribute[] = [],
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || String(v).trim() === '') continue;
    const def = definitions.find((a) => a.key === k);
    if (def?.type === 'NUMBER') {
      const num = Number(v);
      if (!Number.isNaN(num)) result[k] = num;
    } else {
      result[k] = String(v).trim();
    }
  }
  return result;
}
