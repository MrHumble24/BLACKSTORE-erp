import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessoryStockService } from '../accessory-stock/accessory-stock.service';
import { CreateAccessoryStockDto } from '../accessory-stock/dto/create-accessory-stock.dto';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { CreateItemDto } from '../items/dto/create-item.dto';
import { itemSelect, toItem } from '../items/item-shape';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { batchLineSelect, toBatchLine } from './batch-shape';
import { CreateBatchAccessoryDto } from './dto/create-batch-accessory.dto';
import { CreateBatchItemDto } from './dto/create-batch-item.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { applyResplit } from './extra-cost-split';

type Tx = Prisma.TransactionClient;

/** Batch lines: receive devices/accessories and re-price them (PRD FR-16, FR-18). */
@Injectable()
export class BatchLinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
    private readonly accessories: AccessoryStockService,
  ) {}

  /** Adds a device via ItemsService (owner/location from the batch) then re-splits extra costs. */
  async addItem(batchId: number, dto: CreateBatchItemDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        select: { investorId: true, locationId: true },
      });
      if (!batch) throw new NotFoundException('Batch not found');
      const itemDto: CreateItemDto = {
        ...dto,
        investorId: batch.investorId,
        locationId: batch.locationId,
      };
      const created = await this.items.receiveDevice(tx, itemDto, actor, { source: { batchId } });
      await applyResplit(tx, batchId);
      // Re-read so the response reflects the extraCost share just written by the re-split.
      const row = await tx.item.findUniqueOrThrow({ where: { id: created.id }, select: itemSelect });
      return toItem(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** Adds accessories via AccessoryStockService; the purchase line belongs to the batch. */
  async addAccessory(batchId: number, dto: CreateBatchAccessoryDto, actor: PublicUser) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { locationId: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    const stockDto: CreateAccessoryStockDto = { ...dto, locationId: batch.locationId };
    return this.accessories.create(stockDto, actor, { batchId });
  }

  /** Sets a line's unit price (manage_prices); device → Item.purchasePrice, accessory → avgCost. */
  async updateLine(batchId: number, lineId: number, dto: UpdateLineDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.purchaseLine.findUnique({
        where: { id: lineId },
        select: { id: true, batchId: true, itemId: true, productModelId: true, quantity: true, unitPrice: true },
      });
      if (!line || line.batchId !== batchId) {
        throw new NotFoundException('Line not found in this batch');
      }
      const newPrice = new Prisma.Decimal(dto.unitPrice);
      await tx.purchaseLine.update({ where: { id: lineId }, data: { unitPrice: newPrice } });
      if (line.itemId) {
        await tx.item.update({ where: { id: line.itemId }, data: { purchasePrice: newPrice } });
      } else if (line.productModelId) {
        await this.adjustAvgCost(tx, batchId, line.productModelId, line.quantity, line.unitPrice, newPrice);
      }
      await applyResplit(tx, batchId);
      const row = await tx.purchaseLine.findUniqueOrThrow({ where: { id: lineId }, select: batchLineSelect });
      await this.audit.log(
        { userId: actor.id, action: 'update', entity: 'PurchaseLine', entityId: lineId, before: line, after: row },
        tx,
      );
      return toBatchLine(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** avgCost += (new − old) × quantity / currentQuantity; skipped when the row is empty. */
  private async adjustAvgCost(
    tx: Tx,
    batchId: number,
    productModelId: number,
    quantity: number,
    oldPrice: Prisma.Decimal,
    newPrice: Prisma.Decimal,
  ) {
    const batch = await tx.batch.findUniqueOrThrow({
      where: { id: batchId },
      select: { locationId: true },
    });
    const stock = await tx.accessoryStock.findUnique({
      where: { productModelId_locationId: { productModelId, locationId: batch.locationId } },
      select: { id: true, quantity: true, avgCost: true },
    });
    if (!stock || stock.quantity === 0) return;
    // ponytail: avgCost read-then-write is not locked; two simultaneous line re-prices of the same row can skew it. Use SELECT ... FOR UPDATE if it ever matters.
    const delta = newPrice.minus(oldPrice).times(quantity).div(stock.quantity);
    const avgCost = new Prisma.Decimal(stock.avgCost.plus(delta).toFixed(2));
    await tx.accessoryStock.update({ where: { id: stock.id }, data: { avgCost } });
  }
}
