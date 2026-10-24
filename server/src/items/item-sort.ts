import { Prisma } from '@prisma/client';
import { ItemSortBy, SortOrder } from './dto/query-items.dto';

/**
 * Resolves the Prisma orderBy array based on query sortBy and sortOrder,
 * respecting role-based cost visibility.
 */
export function resolveItemOrderBy(
  sortBy?: ItemSortBy,
  sortOrder?: SortOrder,
  canViewCost = false,
): Prisma.ItemOrderByWithRelationInput[] {
  const order: Prisma.SortOrder = sortOrder === SortOrder.ASC ? 'asc' : 'desc';

  switch (sortBy) {
    case ItemSortBy.MODEL:
      return [{ productModel: { name: order } }, { id: 'desc' }];
    case ItemSortBy.SALE_PRICE:
      return [{ salePrice: order }, { id: 'desc' }];
    case ItemSortBy.MIN_SALE_PRICE:
      return [{ minSalePrice: order }, { id: 'desc' }];
    case ItemSortBy.COST:
      return canViewCost
        ? [{ purchasePrice: order }, { id: 'desc' }]
        : [{ id: 'desc' }];
    case ItemSortBy.STATUS:
      return [{ status: order }, { id: 'desc' }];
    case ItemSortBy.CREATED_AT:
      return [{ createdAt: order }, { id: 'desc' }];
    default:
      return [{ id: 'desc' }];
  }
}
