import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsignmentItemStatus, ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { parseTodayOrFutureDate, startOfToday } from '../common/dates';
import { hasPermission } from '../common/permissions';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  consignmentDetailSelect,
  consignmentItemSelect,
  consignmentSummarySelect,
  toConsignment,
  toConsignmentItem,
  toConsignmentSummary,
} from './consignment-shape';
import { CreateConsignmentDto } from './dto/create-consignment.dto';
import { QueryConsignmentsDto } from './dto/query-consignments.dto';
import { UpdateConsignmentDto } from './dto/update-consignment.dto';
import { UpdateConsignmentItemDto } from './dto/update-consignment-item.dto';

type Tx = Prisma.TransactionClient;

/** Consignment handovers, repricing and returns (FR-26, W4). Selling is in ConsignmentSellService. */
@Injectable()
export class ConsignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
  ) {}

  /** Hands over in-stock items to a partner in one transaction (each IN_STOCK → AT_PARTNER). */
  async create(dto: CreateConsignmentDto, actor: PublicUser) {
    const actorId = actor.id;
    const detail = await this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findUnique({ where: { id: dto.partnerId }, select: { id: true } });
      if (!partner) throw new NotFoundException('Partner not found');
      await this.assertHandoverItems(tx, dto.items, hasPermission(actor, 'manage_prices'));
      const consignment = await tx.consignment.create({
        data: {
          partnerId: dto.partnerId,
          handedById: actorId,
          dueDate: parseTodayOrFutureDate(dto.dueDate) ?? null,
          note: dto.note ?? null,
        },
        select: { id: true },
      });
      for (const line of dto.items) {
        // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
        await this.items.changeStatus(tx, line.itemId, ItemStatus.AT_PARTNER);
      }
      await tx.consignmentItem.createMany({
        data: dto.items.map((l) => ({
          consignmentId: consignment.id,
          itemId: l.itemId,
          minPrice: new Prisma.Decimal(l.minPrice),
        })),
      });
      const after = await tx.consignment.findUniqueOrThrow({ where: { id: consignment.id }, select: consignmentDetailSelect });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Consignment', entityId: consignment.id, after },
        tx,
      );
      return after;
    });
    return toConsignment(detail);
  }

  /** Rejects duplicates, missing items, non-stock items (naming the first), non-positive and below-floor prices. */
  private async assertHandoverItems(tx: Tx, lines: CreateConsignmentDto['items'], canManagePrices: boolean) {
    const ids = lines.map((l) => l.itemId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('An item appears twice in the handover');
    for (const line of lines) {
      if (!new Prisma.Decimal(line.minPrice).gt(0)) throw new BadRequestException('minPrice must be greater than 0');
    }
    const rows = await tx.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, minSalePrice: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const line of lines) {
      const item = byId.get(line.itemId);
      if (item === undefined) throw new NotFoundException(`Item #${line.itemId} not found`);
      if (item.status !== ItemStatus.IN_STOCK) throw new BadRequestException(`Item #${line.itemId} is not in stock`);
      assertAboveFloor(line.minPrice, item.minSalePrice, canManagePrices);
    }
  }

  /** Paginated, newest-first list; `open=true` keeps only consignments that still have held items. */
  async findAll(query: QueryConsignmentsDto) {
    const where: Prisma.ConsignmentWhereInput = {
      partnerId: query.partnerId,
      items: query.open === 'true' ? { some: { status: ConsignmentItemStatus.AT_PARTNER } } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.consignment.findMany({
        where,
        select: consignmentSummarySelect,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.consignment.count({ where }),
    ]);
    return { items: rows.map(toConsignmentSummary), total, page: query.page, pageSize: query.pageSize };
  }

  /** One consignment with its items; 404 if missing. */
  async findOne(id: number) {
    const row = await this.prisma.consignment.findUnique({ where: { id }, select: consignmentDetailSelect });
    if (!row) throw new NotFoundException('Consignment not found');
    return toConsignment(row);
  }

  /** Changes (or clears) the due date; returns the updated consignment. */
  async updateDueDate(id: number, dto: UpdateConsignmentDto, actorId: number) {
    const detail = await this.prisma.$transaction(async (tx) => {
      const before = await tx.consignment.findUnique({ where: { id }, select: { id: true, dueDate: true } });
      if (!before) throw new NotFoundException('Consignment not found');
      const dueDate = dto.dueDate === null ? null : (parseTodayOrFutureDate(dto.dueDate) ?? null);
      await tx.consignment.update({ where: { id }, data: { dueDate } });
      const after = await tx.consignment.findUniqueOrThrow({ where: { id }, select: consignmentDetailSelect });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Consignment', entityId: id, before, after: { dueDate } },
        tx,
      );
      return after;
    });
    return toConsignment(detail);
  }

  /** Changes a held item's minimum price (only while AT_PARTNER); returns that item. */
  async updateItemMinPrice(id: number, itemId: number, dto: UpdateConsignmentItemDto, actor: PublicUser) {
    const actorId = actor.id;
    if (!new Prisma.Decimal(dto.minPrice).gt(0)) throw new BadRequestException('minPrice must be greater than 0');
    return this.prisma.$transaction(async (tx) => {
      const { minSalePrice, ...before } = await this.loadHeldItem(tx, id, itemId);
      assertAboveFloor(dto.minPrice, minSalePrice, hasPermission(actor, 'manage_prices'));
      const updated = await tx.consignmentItem.update({
        where: { id: itemId },
        data: { minPrice: new Prisma.Decimal(dto.minPrice) },
        select: consignmentItemSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'ConsignmentItem', entityId: itemId, before, after: updated },
        tx,
      );
      return toConsignmentItem(updated, before.dueDate, startOfToday());
    });
  }

  /** Returns a held item from the partner (AT_PARTNER → IN_STOCK); returns the whole consignment. */
  async returnItem(id: number, itemId: number, actorId: number) {
    const detail = await this.prisma.$transaction(async (tx) => {
      const before = await this.loadHeldItem(tx, id, itemId);
      await this.items.changeStatus(tx, before.itemId, ItemStatus.IN_STOCK);
      await tx.consignmentItem.update({
        where: { id: itemId },
        data: { status: ConsignmentItemStatus.RETURNED, returnedAt: new Date() },
      });
      await this.audit.log(
        { userId: actorId, action: 'return', entity: 'ConsignmentItem', entityId: itemId, before },
        tx,
      );
      return tx.consignment.findUniqueOrThrow({ where: { id }, select: consignmentDetailSelect });
    });
    return toConsignment(detail);
  }

  /** Loads a consignment item that must be AT_PARTNER, with the consignment's due date for the response. */
  private async loadHeldItem(tx: Tx, consignmentId: number, itemId: number) {
    const ci = await tx.consignmentItem.findFirst({
      where: { id: itemId, consignmentId },
      select: {
        id: true,
        itemId: true,
        status: true,
        minPrice: true,
        consignment: { select: { dueDate: true } },
        item: { select: { minSalePrice: true } },
      },
    });
    if (!ci) throw new NotFoundException('Consignment item not found');
    if (ci.status !== ConsignmentItemStatus.AT_PARTNER) {
      throw new BadRequestException('Only a held item (AT_PARTNER) can be changed');
    }
    const { item, consignment, ...rest } = ci;
    return { ...rest, dueDate: consignment.dueDate, minSalePrice: item.minSalePrice };
  }
}

/**
 * FR-20: the partner sells at minPrice, so it may not go below the item's own minSalePrice
 * unless the actor has manage_prices. A null minSalePrice means no floor.
 */
function assertAboveFloor(minPrice: string, floor: Prisma.Decimal | null, canManagePrices: boolean) {
  if (floor && new Prisma.Decimal(minPrice).lt(floor) && !canManagePrices) {
    throw new BadRequestException('Below minimum price');
  }
}
