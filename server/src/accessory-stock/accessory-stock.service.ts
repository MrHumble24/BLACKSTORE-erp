import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { assertAccessoryModel, assertActiveLocation } from '../items/item-queries';
import { PrismaService } from '../prisma/prisma.service';
import { blendAvgCost } from './avg-cost';
import { CreateAccessoryStockDto } from './dto/create-accessory-stock.dto';
import { QueryAccessoryStockDto } from './dto/query-accessory-stock.dto';

const stockSelect = {
  id: true,
  quantity: true,
  avgCost: true,
  productModel: {
    select: { id: true, name: true, category: { select: { id: true, name: true } } },
  },
  location: { select: { id: true, name: true } },
} satisfies Prisma.AccessoryStockSelect;

type StockRow = Prisma.AccessoryStockGetPayload<{ select: typeof stockSelect }>;

/** Quantity-based stock for non-serialized products (PRD FR-4). Always owned by the business. */
@Injectable()
export class AccessoryStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated list ordered by model name, optionally filtered by location and category. */
  async findAll(query: QueryAccessoryStockDto, actor: PublicUser) {
    const where: Prisma.AccessoryStockWhereInput = {
      locationId: query.locationId,
      productModel: query.categoryId ? { categoryId: query.categoryId } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.accessoryStock.findMany({
        where,
        select: stockSelect,
        orderBy: { productModel: { name: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.accessoryStock.count({ where }),
    ]);
    const canViewCost = hasPermission(actor, 'view_cost');
    return {
      items: rows.map((row) => toStock(row, canViewCost)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Adds quantity to the (model, location) row and recomputes avgCost when unitCost is given.
   * `opts.batchId` ties the opening PurchaseLine to a supplier batch (used by /batches/:id/accessories).
   */
  async create(dto: CreateAccessoryStockDto, actor: PublicUser, opts: { batchId?: number } = {}) {
    if (dto.unitCost !== undefined && !hasPermission(actor, 'manage_prices')) {
      throw new ForbiddenException('Setting unitCost requires the manage_prices permission');
    }
    return this.prisma.$transaction(async (tx) => {
      await assertAccessoryModel(tx, dto.productModelId);
      await assertActiveLocation(tx, dto.locationId);
      const key = { productModelId_locationId: { productModelId: dto.productModelId, locationId: dto.locationId } };
      const existing = await tx.accessoryStock.findUnique({
        where: key,
        select: { quantity: true, avgCost: true },
      });
      // ponytail: avgCost read-then-write is not locked; two Admin restocks of the same row at the same moment can skew it. Use SELECT ... FOR UPDATE if it ever matters.
      const avgCost = this.nextAvgCost(existing, dto);
      // Staff restock (no unitCost) buys in at the current avgCost, so it can't drag cost down.
      const unitPrice = dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : avgCost;

      const row = await tx.accessoryStock.upsert({
        where: key,
        create: { productModelId: dto.productModelId, locationId: dto.locationId, quantity: dto.quantity, avgCost },
        update: { quantity: { increment: dto.quantity }, avgCost },
        select: stockSelect,
      });
      await tx.purchaseLine.create({
        data: {
          productModelId: dto.productModelId,
          quantity: dto.quantity,
          unitPrice,
          batchId: opts.batchId,
        },
      });
      await this.audit.log(
        {
          userId: actor.id,
          action: existing ? 'update' : 'create',
          entity: 'AccessoryStock',
          entityId: row.id,
          before: existing,
          after: row,
        },
        tx,
      );
      return toStock(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** avgCost from the shared blend helper; unchanged when no unitCost is given. */
  private nextAvgCost(
    existing: { quantity: number; avgCost: Prisma.Decimal } | null,
    dto: CreateAccessoryStockDto,
  ): Prisma.Decimal {
    const oldAvg = existing?.avgCost ?? new Prisma.Decimal(0);
    if (dto.unitCost === undefined) return oldAvg;
    return blendAvgCost(existing?.quantity ?? 0, oldAvg, dto.quantity, new Prisma.Decimal(dto.unitCost));
  }
}

/** Maps a row to the API shape; avgCost appears only with view_cost. */
function toStock(row: StockRow, canViewCost: boolean) {
  const base = {
    id: row.id,
    productModel: row.productModel,
    location: row.location,
    quantity: row.quantity,
  };
  return canViewCost ? { ...base, avgCost: row.avgCost.toFixed(2) } : base;
}
