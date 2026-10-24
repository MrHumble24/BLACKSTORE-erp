import type { Prisma } from '@prisma/client';

/**
 * The SaleItem fields a warranty message needs (expiry, accessory model, first device identifier).
 * Shared by the warranty-expiry cron and the customer's "Kafolat" bot button so both read the same shape.
 */
export const warrantyItemSelect = {
  warrantyUntil: true,
  productModel: { select: { name: true } },
  item: { select: { identifiers: { select: { value: true }, take: 1 } } },
} satisfies Prisma.SaleItemSelect;

/** Human label for a sale item: accessory model name, else the first device identifier, else a generic. */
export function deviceName(item: {
  productModel: { name: string } | null;
  item: { identifiers: { value: string }[] } | null;
}): string {
  return item.productModel?.name ?? item.item?.identifiers[0]?.value ?? 'Mahsulot';
}
