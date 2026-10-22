import { Prisma } from '@prisma/client';

/** One query that loads everything the Item response needs (no N+1 on lists). */
export const itemSelect = {
  id: true,
  status: true,
  condition: true,
  attributes: true,
  salePrice: true,
  minSalePrice: true,
  purchasePrice: true,
  extraCost: true,
  createdAt: true,
  updatedAt: true,
  productModel: {
    select: { id: true, name: true, category: { select: { id: true, name: true } } },
  },
  investor: { select: { id: true, name: true, code: true, isOwn: true } },
  location: { select: { id: true, name: true, type: true } },
  identifiers: { select: { id: true, type: true, value: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.ItemSelect;

export type ItemRow = Prisma.ItemGetPayload<{ select: typeof itemSelect }>;

/**
 * Maps a loaded item to the API shape. Cost fields (purchasePrice, extraCost, cost)
 * are present only when the viewer has view_cost; otherwise the keys are absent.
 * isOwn is null for ordinary investors and reads as false.
 */
export function toItem(row: ItemRow, canViewCost: boolean) {
  const base = {
    id: row.id,
    productModel: row.productModel,
    investor: { ...row.investor, isOwn: row.investor.isOwn ?? false },
    location: row.location,
    status: row.status,
    condition: row.condition,
    attributes: row.attributes,
    salePrice: row.salePrice?.toFixed(2) ?? null,
    minSalePrice: row.minSalePrice?.toFixed(2) ?? null,
    identifiers: row.identifiers,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (!canViewCost) return base;
  const cost = row.purchasePrice.plus(row.extraCost); // BR-1: cost = purchasePrice + extraCost
  return {
    ...base,
    purchasePrice: row.purchasePrice.toFixed(2),
    extraCost: row.extraCost.toFixed(2),
    cost: cost.toFixed(2),
  };
}
