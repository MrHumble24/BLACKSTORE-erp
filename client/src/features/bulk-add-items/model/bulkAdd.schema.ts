import { z } from 'zod';
import type { CategoryAttribute } from '@/entities/category';
import { validateRequiredAttributes } from '@/entities/item';
import { POSITIVE_MONEY_PATTERN } from '@/shared/lib';

type TFn = (k: string, options?: Record<string, unknown>) => string;
type Prices = { purchasePrice: string; salePrice: string; minSalePrice: string };

/** Price fields: optional, but a filled one must be positive money and min ≤ sale. */
function refinePrices(data: Prices, ctx: z.RefinementCtx, t: TFn) {
  const checkPrice = (value: string, path: keyof Prices) => {
    const trimmed = value.trim();
    if (trimmed && !POSITIVE_MONEY_PATTERN.test(trimmed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('bulkAdd.validation.priceInvalid'), path: [path] });
    }
  };
  checkPrice(data.purchasePrice, 'purchasePrice');
  checkPrice(data.salePrice, 'salePrice');
  checkPrice(data.minSalePrice, 'minSalePrice');

  const sale = data.salePrice.trim();
  const min = data.minSalePrice.trim();
  if (sale && min && POSITIVE_MONEY_PATTERN.test(sale) && POSITIVE_MONEY_PATTERN.test(min)) {
    if (Number(min.replace(',', '.')) > Number(sale.replace(',', '.'))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('items.validation.minPriceAboveSale'),
        path: ['minSalePrice'],
      });
    }
  }
}

/** Zod schema for the one-time bulk-add settings; checked once per device before its first code. */
export function createBulkAddSchema(
  t: TFn,
  attributesList: CategoryAttribute[],
) {
  return z
    .object({
      categoryId: z.number().min(1, t('items.validation.categoryRequired')),
      productModelId: z.number().min(1, t('items.validation.modelRequired')),
      investorId: z.number().min(1, t('items.validation.ownerRequired')),
      locationId: z.number().min(1, t('items.validation.locationRequired')),
      condition: z.enum(['NEW', 'USED', 'REFURBISHED'] as const),
      attributes: z.record(z.string(), z.union([z.string(), z.number()])),
      purchasePrice: z.string(),
      salePrice: z.string(),
      minSalePrice: z.string(),
      codes: z.object({
        imei: z.boolean(),
        imei2: z.boolean(),
        serial: z.boolean(),
      }),
    })
    .superRefine((data, ctx) => {
      validateRequiredAttributes(data.attributes, attributesList, ctx, t);

      // A device needs at least one primary code; IMEI 2 alone cannot identify it.
      if (!data.codes.imei && !data.codes.serial) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('bulkAdd.validation.codesRequired'),
          path: ['codes', 'imei'],
        });
      }

      refinePrices(data, ctx, t);
    });
}
