import { Prisma } from '@prisma/client';

/**
 * Staff-readable item summary used across F06 (transfers, stock counts).
 * Unlike itemSelect it carries no cost fields, so it is safe for every role.
 */
export const itemBriefSelect = {
  id: true,
  status: true,
  identifiers: { select: { id: true, type: true, value: true }, orderBy: { id: 'asc' } },
  productModel: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
} satisfies Prisma.ItemSelect;

export type ItemBrief = Prisma.ItemGetPayload<{ select: typeof itemBriefSelect }>;
