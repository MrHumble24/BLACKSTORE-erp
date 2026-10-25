import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { itemSelect } from './item-shape';
import { attributeDefSelect, LOCKED_STATUSES, normalizeIdentifier, validateAttributes } from './item-validation';
import type { QueryItemsDto } from './dto/query-items.dto';

type Tx = Prisma.TransactionClient;

/** The minimal fields loadContextAndAttributes needs from a create/receive request. */
interface ItemContext {
  productModelId: number;
  investorId: number;
  locationId: number;
  attributes?: Record<string, string | number>;
}

/** Select used when loading an item for edit: adds the model + attribute defs. */
export const editItemSelect = {
  ...itemSelect,
  productModelId: true,
  productModel: {
    select: {
      id: true,
      name: true,
      category: {
        select: { id: true, name: true, attributes: { select: attributeDefSelect } },
      },
    },
  },
} satisfies Prisma.ItemSelect;

export type EditItemRow = Prisma.ItemGetPayload<{ select: typeof editItemSelect }>;

/** Validates the model (serialized), investor and location, and returns cleaned attributes. */
export async function loadContextAndAttributes(tx: Tx, dto: ItemContext) {
  const model = await tx.productModel.findUnique({
    where: { id: dto.productModelId },
    select: {
      category: { select: { isSerialized: true, attributes: { select: attributeDefSelect } } },
    },
  });
  if (!model) throw new NotFoundException('Product model not found');
  if (!model.category.isSerialized) {
    throw new BadRequestException('This category is not serialized; use POST /accessory-stock');
  }
  await assertActive(tx, dto.investorId, dto.locationId);
  return validateAttributes(dto.attributes, model.category.attributes);
}

/**
 * Fields the sale path needs from a device being sold: status and location to
 * validate it, price floor for the minimum-price rule, and cost + investor share
 * for the BR-7 snapshot.
 */
export const sellDeviceSelect = {
  id: true,
  status: true,
  locationId: true,
  productModelId: true,
  purchasePrice: true,
  extraCost: true,
  minSalePrice: true,
  investorId: true,
  investor: { select: { id: true, name: true, code: true, shareType: true, shareValue: true } },
} satisfies Prisma.ItemSelect;

export type SellDeviceRow = Prisma.ItemGetPayload<{ select: typeof sellDeviceSelect }>;

/** 404 if the location is missing, 400 if it is inactive (sale/stock path: investor is irrelevant). */
export async function assertActiveLocation(tx: Tx, locationId: number): Promise<void> {
  const location = await tx.location.findUnique({
    where: { id: locationId },
    select: { isActive: true },
  });
  if (!location) throw new NotFoundException('Location not found');
  if (!location.isActive) throw new BadRequestException('Location is inactive');
}

/** 404 if the model is missing; 400 if its category is serialized (accessory callers handle non-serialized only). */
export async function assertAccessoryModel(tx: Tx, productModelId: number): Promise<void> {
  const model = await tx.productModel.findUnique({
    where: { id: productModelId },
    select: { category: { select: { isSerialized: true } } },
  });
  if (!model) throw new NotFoundException('Product model not found');
  if (model.category.isSerialized) {
    throw new BadRequestException('This category is serialized; use POST /items');
  }
}

/** 400 if the investor or location is inactive or missing. */
export async function assertActive(tx: Tx, investorId: number, locationId: number) {
  const [investor, location] = await Promise.all([
    tx.investor.findUnique({ where: { id: investorId }, select: { isActive: true } }),
    tx.location.findUnique({ where: { id: locationId }, select: { isActive: true } }),
  ]);
  if (!investor?.isActive) throw new BadRequestException('Investor is inactive or does not exist');
  if (!location?.isActive) throw new BadRequestException('Location is inactive or does not exist');
}

/** Loads an item for editing and enforces the past-records permission (FR-29). */
export async function loadForEdit(tx: Tx, id: number, actor: PublicUser): Promise<EditItemRow> {
  const row = await tx.item.findUnique({ where: { id }, select: editItemSelect });
  if (!row) throw new NotFoundException('Item not found');
  if (LOCKED_STATUSES.includes(row.status) && !hasPermission(actor, 'edit_past_records')) {
    throw new ForbiddenException('Editing a past record requires the edit_past_records permission');
  }
  return row;
}

/** Looks up any taken identifier value and throws a 409 naming the owning item. */
export async function assertIdentifiersFree(tx: Tx, values: string[]) {
  const existing = await tx.itemIdentifier.findFirst({
    where: { value: { in: values } },
    select: { type: true, value: true, itemId: true },
  });
  if (existing) {
    throw new ConflictException(
      `${existing.type} ${existing.value} already belongs to item #${existing.itemId}`,
    );
  }
}

/** Keeps the newest opening/walk-in PurchaseLine.unitPrice equal to the item's purchasePrice. */
export async function syncLatestPurchaseLine(tx: Tx, itemId: number, unitPrice: string) {
  // Skip batch lines: they are the supplier ledger that balances are computed from (BR-8).
  const latest = await tx.purchaseLine.findFirst({
    where: { itemId, batchId: null },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  if (latest) {
    await tx.purchaseLine.update({
      where: { id: latest.id },
      data: { unitPrice: new Prisma.Decimal(unitPrice) },
    });
  }
}

/** Builds the Prisma where clause for QueryItemsDto including category, model, and variant attribute filters. */
export function buildItemWhere(query: QueryItemsDto): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {
    status: query.status,
    condition: query.condition,
    locationId: query.locationId,
    investorId: query.investorId,
    productModelId: query.productModelId,
    productModel: query.categoryId ? { categoryId: query.categoryId } : undefined,
    ...(query.isUnpriced ? { salePrice: null } : {}),
  };
  if (query.attributes && typeof query.attributes === 'object') {
    const activeAttrs = Object.entries(query.attributes).filter(
      ([, val]) => val !== undefined && val !== null && val !== '' && val !== 'ALL',
    );
    if (activeAttrs.length > 0) {
      const attrFilters = activeAttrs.map(([key, val]) => ({
        attributes: { path: [key], equals: val },
      }));
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        ...attrFilters,
      ];
    }
  }
  if (query.search) {
    const term = query.search.trim();
    where.OR = [
      { identifiers: { some: { value: normalizeIdentifier(query.search) } } },
      { productModel: { name: { contains: term, mode: 'insensitive' } } },
    ];
  }
  return where;
}
