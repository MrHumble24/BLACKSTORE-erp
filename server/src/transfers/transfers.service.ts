import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { dateRange } from '../common/dates';
import { assertActiveLocation } from '../items/item-queries';
import { blendAvgCost } from '../accessory-stock/avg-cost';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, TransferAccessoryDto } from './dto/create-transfer.dto';
import { QueryTransfersDto } from './dto/query-transfers.dto';
import { toTransfer, toTransferSummary, transferDetailSelect, transferSummarySelect } from './transfer-shape';

type Tx = Prisma.TransactionClient;

/** Stock transfers between locations: devices move whole, accessories move by quantity (FR-5, W6). */
@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated, newest-first list; `locationId` matches either end, `itemId` a moved device. */
  async findAll(query: QueryTransfersDto) {
    const where: Prisma.TransferWhereInput = {
      date: dateRange(query.from, query.to),
      items: query.itemId ? { some: { itemId: query.itemId } } : undefined,
      OR: query.locationId
        ? [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }]
        : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.transfer.findMany({
        where,
        select: transferSummarySelect,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.transfer.count({ where }),
    ]);
    return { items: rows.map(toTransferSummary), total, page: query.page, pageSize: query.pageSize };
  }

  /** One transfer with its items and accessories; 404 if missing. */
  async findOne(id: number) {
    const row = await this.prisma.transfer.findUnique({ where: { id }, select: transferDetailSelect });
    if (!row) throw new NotFoundException('Transfer not found');
    return toTransfer(row);
  }

  /** Validates and moves devices + accessory quantities in one transaction, auditing once. */
  async create(dto: CreateTransferDto, actor: PublicUser) {
    const itemIds = dto.itemIds ?? [];
    const accessories = dto.accessories ?? [];
    this.assertValidLines(dto, itemIds, accessories);
    const created = await this.prisma.$transaction(async (tx) => {
      await assertActiveLocation(tx, dto.fromLocationId);
      await assertActiveLocation(tx, dto.toLocationId);
      await this.moveItems(tx, itemIds, dto.fromLocationId, dto.toLocationId);
      await this.moveAccessories(tx, accessories, dto.fromLocationId, dto.toLocationId);
      const transfer = await tx.transfer.create({
        data: {
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          userId: actor.id,
          note: dto.note,
          items: { create: itemIds.map((itemId) => ({ itemId })) },
          accessories: { create: accessories.map((a) => ({ productModelId: a.productModelId, quantity: a.quantity })) },
        },
        select: transferDetailSelect,
      });
      await this.audit.log(
        { userId: actor.id, action: 'create', entity: 'Transfer', entityId: transfer.id, after: { itemIds, accessories } },
        tx,
      );
      return transfer;
    });
    return toTransfer(created);
  }

  /** from ≠ to, no duplicate items, at least one line. */
  private assertValidLines(dto: CreateTransferDto, itemIds: number[], accessories: TransferAccessoryDto[]) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Source and destination locations must differ');
    }
    if (itemIds.length === 0 && accessories.length === 0) {
      throw new BadRequestException('A transfer needs at least one item or accessory line');
    }
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException('itemIds contains duplicates');
    }
    const modelIds = accessories.map((a) => a.productModelId);
    if (new Set(modelIds).size !== modelIds.length) {
      throw new BadRequestException('accessories contains duplicate product models');
    }
  }

  /** Every item must be IN_STOCK at the source (400 naming the first that is not), then move them. */
  private async moveItems(tx: Tx, itemIds: number[], from: number, to: number) {
    if (itemIds.length === 0) return;
    const items = await tx.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, status: true, locationId: true },
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const id of itemIds) {
      const item = byId.get(id);
      if (!item || item.status !== ItemStatus.IN_STOCK || item.locationId !== from) {
        throw new BadRequestException(`Item #${id} is not in stock at the source location`);
      }
    }
    // Precondition in the write guards against a concurrent change between the read and here.
    const { count } = await tx.item.updateMany({
      where: { id: { in: itemIds }, status: ItemStatus.IN_STOCK, locationId: from },
      data: { locationId: to },
    });
    if (count !== itemIds.length) throw new ConflictException('An item changed while transferring');
  }

  /** Moves each accessory line, strictly sequentially (shared tx connection must not interleave). */
  private async moveAccessories(tx: Tx, lines: TransferAccessoryDto[], from: number, to: number) {
    // Sequential by necessity: the lines share one tx connection and must not interleave.
    for (const line of lines) {
      // eslint-disable-next-line no-await-in-loop
      await this.moveOneAccessory(tx, line, from, to);
    }
  }

  /** Decrement the source accessory row, increment (or create) the target, re-averaging its avgCost. */
  private async moveOneAccessory(tx: Tx, line: TransferAccessoryDto, from: number, to: number) {
    const key = (locationId: number) => ({
      productModelId_locationId: { productModelId: line.productModelId, locationId },
    });
    // Conditional decrement: the quantity guard lives in the write, so two transfers can't oversell.
    const { count } = await tx.accessoryStock.updateMany({
      where: { productModelId: line.productModelId, locationId: from, quantity: { gte: line.quantity } },
      data: { quantity: { decrement: line.quantity } },
    });
    if (count === 0) {
      throw new BadRequestException(`Not enough stock of product model #${line.productModelId} at the source location`);
    }
    // avgCost is unchanged by the decrement, so reading it after the guarded write is safe.
    const src = await tx.accessoryStock.findUnique({ where: key(from), select: { avgCost: true } });
    const tgt = await tx.accessoryStock.findUnique({ where: key(to), select: { quantity: true, avgCost: true } });
    const srcAvg = src?.avgCost ?? new Prisma.Decimal(0);
    const avgCost = blendAvgCost(tgt?.quantity ?? 0, tgt?.avgCost ?? new Prisma.Decimal(0), line.quantity, srcAvg);
    await tx.accessoryStock.upsert({
      where: key(to),
      create: { productModelId: line.productModelId, locationId: to, quantity: line.quantity, avgCost },
      update: { quantity: { increment: line.quantity }, avgCost },
    });
  }
}
