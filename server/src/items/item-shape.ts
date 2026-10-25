import { Prisma } from '@prisma/client';
import { lineTotal } from '../common/money';

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

/** Latest walk-in line of a device, for the device panel (F32); view_cost viewers only. */
export const walkInLineSelect = {
  id: true,
  unitPrice: true,
  quantity: true,
  paidAt: true,
  walkInSeller: { select: { name: true } },
  paidBy: { select: { id: true, name: true } },
} satisfies Prisma.PurchaseLineSelect;

export type WalkInLineRow = Prisma.PurchaseLineGetPayload<{ select: typeof walkInLineSelect }>;

/**
 * Device-panel walk-in summary: seller, amount paid and payout status (F32).
 * canUndo mirrors the unpay rule: paid inside the current OPEN day (openDayAt null = no open day).
 */
export function toWalkIn(l: WalkInLineRow, openDayAt: Date | null) {
  return {
    lineId: l.id,
    sellerName: l.walkInSeller?.name ?? '',
    amount: lineTotal(l).toFixed(2),
    paidAt: l.paidAt?.toISOString() ?? null,
    paidBy: l.paidBy,
    canUndo: l.paidAt != null && openDayAt != null && l.paidAt >= openDayAt,
  };
}
