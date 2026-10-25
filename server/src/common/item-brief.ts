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

/** Human label for an item line: model name, else first identifier, else "Device". */
export function itemLabel(
  productModel: { name: string } | null | undefined,
  identifiers: { value: string }[] | undefined,
): string {
  return productModel?.name ?? identifiers?.[0]?.value ?? 'Device';
}

export type ItemBrief = Prisma.ItemGetPayload<{ select: typeof itemBriefSelect }>;
