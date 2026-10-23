import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { AccessoryStockService } from '../accessory-stock/accessory-stock.service';
import { CreateAccessoryStockDto } from '../accessory-stock/dto/create-accessory-stock.dto';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { CreateItemDto } from '../items/dto/create-item.dto';
import { itemSelect, toItem } from '../items/item-shape';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertBatchEditable } from './batch-lock';
import { batchDetailSelect, batchLineSelect, toBatch, toBatchLine } from './batch-shape';
import { CreateBatchAccessoryDto } from './dto/create-batch-accessory.dto';
import { CreateBatchItemDto } from './dto/create-batch-item.dto';
import { RepriceModelDto } from './dto/reprice-model.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { applyResplit } from './extra-cost-split';

type Tx = Prisma.TransactionClient;

/** Fields of a line needed to reprice it (device → item price, accessory → avgCost). */
const repriceSelect = {
  id: true,
  batchId: true,
  itemId: true,
  productModelId: true,
  quantity: true,
  unitPrice: true,
} satisfies Prisma.PurchaseLineSelect;
type RepriceLine = Prisma.PurchaseLineGetPayload<{ select: typeof repriceSelect }>;

/** Line + device item (with later-record counts) needed to remove it safely. */
const removeSelect = {
  id: true,
  batchId: true,
  quantity: true,
  productModelId: true,
  unitPrice: true,
  extraCost: true,
  item: {
    select: {
      id: true,
      status: true,
      productModelId: true,
      investorId: true,
      locationId: true,
      condition: true,
      attributes: true,
      purchasePrice: true,
      extraCost: true,
      salePrice: true,
      minSalePrice: true,
      identifiers: { select: { id: true, type: true, value: true } },
      _count: {
        select: { saleItems: true, consignmentItems: true, transferItems: true, stockCountScans: true },
      },
    },
  },
} satisfies Prisma.PurchaseLineSelect;
type RemoveLine = Prisma.PurchaseLineGetPayload<{ select: typeof removeSelect }>;

/** Batch lines: receive devices/accessories, re-price and remove them (PRD FR-16, FR-18, FR-29). */
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
        select: { investorId: true, locationId: true, arrivalDate: true },
      });
      if (!batch) throw new NotFoundException('Batch not found');
      assertBatchEditable(batch, actor);
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
      select: { locationId: true, arrivalDate: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    assertBatchEditable(batch, actor);
    const stockDto: CreateAccessoryStockDto = { ...dto, locationId: batch.locationId };
    return this.accessories.create(stockDto, actor, { batchId });
  }

  /** Sets one line's unit price (manage_prices); device → Item.purchasePrice, accessory → avgCost. */
  async updateLine(batchId: number, lineId: number, dto: UpdateLineDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertEditable(tx, batchId, actor);
      const line = await tx.purchaseLine.findUnique({ where: { id: lineId }, select: repriceSelect });
      if (!line || line.batchId !== batchId) {
        throw new NotFoundException('Line not found in this batch');
      }
      await this.repriceLine(tx, batchId, line, new Prisma.Decimal(dto.unitPrice), actor);
      await applyResplit(tx, batchId);
      const row = await tx.purchaseLine.findUniqueOrThrow({ where: { id: lineId }, select: batchLineSelect });
      return toBatchLine(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** Reprices every line of one product model in the batch (manage_prices); one re-split at the end. */
  async repriceModel(batchId: number, dto: RepriceModelDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertEditable(tx, batchId, actor);
      // Device lines carry the model on their item; accessory lines carry it on the line itself.
      const lines = await tx.purchaseLine.findMany({
        where: {
          batchId,
          OR: [{ productModelId: dto.productModelId }, { item: { productModelId: dto.productModelId } }],
        },
        select: repriceSelect,
        orderBy: { id: 'asc' },
      });
      if (lines.length === 0) throw new NotFoundException('No line of that model in this batch');
      const newPrice = new Prisma.Decimal(dto.unitPrice);
      for (const line of lines) {
        // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
        await this.repriceLine(tx, batchId, line, newPrice, actor);
      }
      await applyResplit(tx, batchId);
      const row = await tx.batch.findUniqueOrThrow({ where: { id: batchId }, select: batchDetailSelect });
      return toBatch(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** Removes a batch line (delete_records); device line deletes the item, accessory line decrements stock. */
  async removeLine(batchId: number, lineId: number, actor: PublicUser) {
    await this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        select: { arrivalDate: true, locationId: true, location: { select: { name: true } } },
      });
      if (!batch) throw new NotFoundException('Batch not found');
      assertBatchEditable(batch, actor);
      const line = await tx.purchaseLine.findUnique({ where: { id: lineId }, select: removeSelect });
      if (!line || line.batchId !== batchId) {
        throw new NotFoundException('Line not found in this batch');
      }
      if (line.item) await this.removeDeviceLine(tx, line, actor);
      else await this.removeAccessoryLine(tx, line, batch.locationId, batch.location.name, actor);
      await applyResplit(tx, batchId);
    });
  }

  /** Per-line reprice shared by updateLine and repriceModel; writes one audit row. */
  private async repriceLine(
    tx: Tx,
    batchId: number,
    line: RepriceLine,
    newPrice: Prisma.Decimal,
    actor: PublicUser,
  ) {
    await tx.purchaseLine.update({ where: { id: line.id }, data: { unitPrice: newPrice } });
    if (line.itemId) {
      await tx.item.update({ where: { id: line.itemId }, data: { purchasePrice: newPrice } });
    } else if (line.productModelId) {
      await this.adjustAvgCost(tx, batchId, line.productModelId, line.quantity, line.unitPrice, newPrice);
    }
    const after = await tx.purchaseLine.findUniqueOrThrow({ where: { id: line.id }, select: batchLineSelect });
    await this.audit.log(
      { userId: actor.id, action: 'update', entity: 'PurchaseLine', entityId: line.id, before: line, after },
      tx,
    );
  }

  /** Device line: item must be IN_STOCK with no later record; deletes identifiers, item and line. */
  private async removeDeviceLine(tx: Tx, line: RemoveLine, actor: PublicUser) {
    const item = line.item;
    if (!item) throw new NotFoundException('Line not found in this batch');
    const { _count: counts } = item;
    const hasLater =
      counts.saleItems + counts.consignmentItems + counts.transferItems + counts.stockCountScans > 0;
    if (item.status !== ItemStatus.IN_STOCK || hasLater) {
      throw new ConflictException(
        `Device #${item.id} was already sold, handed over or moved; it cannot be removed`,
      );
    }
    await tx.itemIdentifier.deleteMany({ where: { itemId: item.id } });
    await tx.purchaseLine.delete({ where: { id: line.id } });
    await tx.item.delete({ where: { id: item.id } });
    await this.audit.log({ userId: actor.id, action: 'delete', entity: 'Item', entityId: item.id, before: item }, tx);
    await this.audit.log(
      { userId: actor.id, action: 'delete', entity: 'PurchaseLine', entityId: line.id, before: line },
      tx,
    );
  }

  /** Accessory line: stock must hold ≥ quantity; decrements it (avgCost unchanged) and deletes the line. */
  private async removeAccessoryLine(
    tx: Tx,
    line: RemoveLine,
    locationId: number,
    locationName: string,
    actor: PublicUser,
  ) {
    const productModelId = line.productModelId;
    if (productModelId == null) throw new NotFoundException('Line not found in this batch');
    const stock = await tx.accessoryStock.findUnique({
      where: { productModelId_locationId: { productModelId, locationId } },
      select: { id: true, quantity: true },
    });
    if (!stock || stock.quantity < line.quantity) {
      const left = stock?.quantity ?? 0;
      throw new ConflictException(`Only ${left} units are left at ${locationName}; the line cannot be removed`);
    }
    // ponytail: cost history is not unwound; avgCost stays as it is (correcting entries only move it forward).
    const after = await tx.accessoryStock.update({
      where: { id: stock.id },
      data: { quantity: { decrement: line.quantity } },
      select: { id: true, quantity: true, avgCost: true },
    });
    await tx.purchaseLine.delete({ where: { id: line.id } });
    await this.audit.log(
      { userId: actor.id, action: 'update', entity: 'AccessoryStock', entityId: stock.id, before: stock, after },
      tx,
    );
    await this.audit.log(
      { userId: actor.id, action: 'delete', entity: 'PurchaseLine', entityId: line.id, before: line },
      tx,
    );
  }

  /**
   * avgCost += (new − old) × min(line.quantity, stock.quantity) / stock.quantity; skipped when
   * the row is empty. Capping by the units still in stock keeps a late correction from moving the
   * average by more than the price change itself.
   */
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
    const units = Math.min(quantity, stock.quantity);
    const delta = newPrice.minus(oldPrice).times(units).div(stock.quantity);
    const avgCost = new Prisma.Decimal(stock.avgCost.plus(delta).toFixed(2));
    await tx.accessoryStock.update({ where: { id: stock.id }, data: { avgCost } });
  }

  /** Loads the batch and 403s a past batch without edit_past_records; shared by the reprice endpoints. */
  private async assertEditable(tx: Tx, batchId: number, actor: PublicUser) {
    const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { arrivalDate: true } });
    if (!batch) throw new NotFoundException('Batch not found');
    assertBatchEditable(batch, actor);
  }
}
