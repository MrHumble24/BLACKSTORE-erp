import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentifierType, ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIdentifierDto } from './dto/create-identifier.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemPricesDto } from './dto/update-item-prices.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import {
  assertIdentifiersFree,
  loadContextAndAttributes,
  loadForEdit,
  syncLatestPurchaseLine,
} from './item-queries';
import { itemSelect, toItem } from './item-shape';
import {
  assertHasPrimaryIdentifier,
  assertIdentifierCaps,
  assertPriceOrder,
  normalizeIdentifier,
  STATUS_TRANSITIONS,
  validateAttributes,
  validateIdentifier,
} from './item-validation';

type Tx = Prisma.TransactionClient;

/** Where a received device's opening PurchaseLine comes from, and whether Staff may price it. */
export interface ReceiveOpts {
  source?: { batchId?: number; walkInSellerId?: number };
  // Walk-in buyers hand over the cash, so they may enter pricePaid without manage_prices (W5 step 2).
  allowPriceWithoutPermission?: boolean;
  // Audit action for the created item; defaults to 'create'. The stock import sets 'import' (FR-7).
  auditAction?: string;
}

/** Serialized devices: list, scan, create, edit, prices, identifiers and status (PRD F03). */
@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated, newest-first list with optional filters and identifier/model search. */
  async findAll(query: QueryItemsDto, actor: PublicUser) {
    const where: Prisma.ItemWhereInput = {
      status: query.status,
      locationId: query.locationId,
      investorId: query.investorId,
      productModel: query.categoryId ? { categoryId: query.categoryId } : undefined,
    };
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { identifiers: { some: { value: normalizeIdentifier(query.search) } } },
        { productModel: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        select: itemSelect,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);
    const canViewCost = hasPermission(actor, 'view_cost');
    return {
      items: rows.map((row) => toItem(row, canViewCost)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** One item by id; 404 if missing. */
  async findOne(id: number, actor: PublicUser) {
    const row = await this.prisma.item.findUnique({ where: { id }, select: itemSelect });
    if (!row) throw new NotFoundException('Item not found');
    return toItem(row, hasPermission(actor, 'view_cost'));
  }

  /** Scan lookup: find the item whose identifier equals the (normalized) code. */
  async findByCode(code: string, actor: PublicUser) {
    const value = normalizeIdentifier(code);
    const ident = await this.prisma.itemIdentifier.findUnique({
      where: { value },
      select: { itemId: true },
    });
    if (!ident) throw new NotFoundException('Item not found');
    return this.findOne(ident.itemId, actor);
  }

  /** Receives one serialized device in its own transaction (opening stock or a batch line). */
  async create(dto: CreateItemDto, actor: PublicUser, opts: ReceiveOpts = {}) {
    return this.prisma.$transaction((tx) => this.receiveDevice(tx, dto, actor, opts));
  }

  /**
   * Shared device-receive logic, run inside a caller's transaction so batches and
   * walk-in purchases can wrap it together with their own writes (seller, re-split).
   */
  async receiveDevice(tx: Tx, dto: CreateItemDto, actor: PublicUser, opts: ReceiveOpts = {}) {
    this.assertPriceGate(dto, actor, opts);
    const types = dto.identifiers.map((i) => i.type);
    assertHasPrimaryIdentifier(types);
    assertIdentifierCaps(types, []);
    assertPriceOrder(dto.salePrice, dto.minSalePrice);
    const identifiers = dto.identifiers.map((i) => ({
      type: i.type,
      value: validateIdentifier(i.type, i.value),
    }));
    const attributes = await loadContextAndAttributes(tx, dto);
    await assertIdentifiersFree(tx, identifiers.map((i) => i.value));
    const purchasePrice = new Prisma.Decimal(dto.purchasePrice ?? '0'); // 0 when absent (no DB default)
    const row = await tx.item.create({
      data: {
        productModelId: dto.productModelId,
        investorId: dto.investorId,
        locationId: dto.locationId,
        condition: dto.condition,
        attributes,
        purchasePrice,
        salePrice: dto.salePrice ? new Prisma.Decimal(dto.salePrice) : null,
        minSalePrice: dto.minSalePrice ? new Prisma.Decimal(dto.minSalePrice) : null,
        identifiers: { create: identifiers },
      },
      select: itemSelect,
    });
    await tx.purchaseLine.create({
      data: {
        itemId: row.id,
        quantity: 1,
        unitPrice: purchasePrice,
        batchId: opts.source?.batchId,
        walkInSellerId: opts.source?.walkInSellerId,
      },
    });
    await this.audit.log(
      {
        userId: actor.id,
        action: opts.auditAction ?? 'create',
        entity: 'Item',
        entityId: row.id,
        after: row,
      },
      tx,
    );
    return toItem(row, hasPermission(actor, 'view_cost'));
  }

  /** Updates condition and/or attributes; past-record edits need edit_past_records. */
  async update(id: number, dto: UpdateItemDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await loadForEdit(tx, id, actor);
      const attributes =
        dto.attributes === undefined
          ? undefined
          : validateAttributes(dto.attributes, before.productModel.category.attributes);
      const row = await tx.item.update({
        where: { id },
        data: { condition: dto.condition, attributes },
        select: itemSelect,
      });
      await this.logUpdate(tx, id, actor, before, row);
      return toItem(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** Sets prices (manage_prices) and keeps the latest PurchaseLine.unitPrice in sync. */
  async updatePrices(id: number, dto: UpdateItemPricesDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await loadForEdit(tx, id, actor);
      const sale = dto.salePrice ?? before.salePrice?.toFixed(2) ?? null;
      const min = dto.minSalePrice ?? before.minSalePrice?.toFixed(2) ?? null;
      assertPriceOrder(sale, min);
      const row = await tx.item.update({
        where: { id },
        data: {
          purchasePrice: dto.purchasePrice ? new Prisma.Decimal(dto.purchasePrice) : undefined,
          salePrice: dto.salePrice ? new Prisma.Decimal(dto.salePrice) : undefined,
          minSalePrice: dto.minSalePrice ? new Prisma.Decimal(dto.minSalePrice) : undefined,
        },
        select: itemSelect,
      });
      if (dto.purchasePrice) await syncLatestPurchaseLine(tx, id, dto.purchasePrice);
      await this.logUpdate(tx, id, actor, before, row);
      return toItem(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** Adds one identifier to an item, enforcing caps and uniqueness. */
  async addIdentifier(id: number, dto: CreateIdentifierDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await loadForEdit(tx, id, actor);
      const value = validateIdentifier(dto.type, dto.value);
      assertIdentifierCaps([dto.type], before.identifiers.map((i) => i.type));
      await assertIdentifiersFree(tx, [value]);
      const identifier = await tx.itemIdentifier.create({
        data: { itemId: id, type: dto.type, value },
        select: { id: true, type: true, value: true },
      });
      await this.audit.log(
        {
          userId: actor.id,
          action: 'update',
          entity: 'Item',
          entityId: id,
          before,
          after: { ...before, identifiers: [...before.identifiers, identifier] },
        },
        tx,
      );
      return identifier;
    });
  }

  /**
   * Returns the item's printed label code (FR-15), creating `BS-<id padded to 6>` once.
   * `created` is false when it already had one. Same past-record lock as addIdentifier.
   */
  async setSystemCode(id: number, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await loadForEdit(tx, id, actor);
      const current = before.identifiers.find((i) => i.type === IdentifierType.SYSTEM_CODE);
      if (current) return { identifier: current, created: false };
      const value = `BS-${String(id).padStart(6, '0')}`;
      const identifier = await tx.itemIdentifier.create({
        data: { itemId: id, type: IdentifierType.SYSTEM_CODE, value },
        select: { id: true, type: true, value: true },
      });
      await this.audit.log(
        {
          userId: actor.id,
          action: 'update',
          entity: 'Item',
          entityId: id,
          before,
          after: { ...before, identifiers: [...before.identifiers, identifier] },
        },
        tx,
      );
      return { identifier, created: true };
    });
  }

  /**
   * BR-9 status change. Called inside a caller's transaction by sales, consignment,
   * transfers, returns and walk-in buy-back. Throws 400 for any move not allowed.
   */
  async changeStatus(tx: Tx, itemId: number, to: ItemStatus) {
    const item = await tx.item.findUnique({ where: { id: itemId }, select: { status: true } });
    if (!item) throw new NotFoundException('Item not found');
    if (!STATUS_TRANSITIONS[item.status].includes(to)) {
      throw new BadRequestException(`Cannot move item from ${item.status} to ${to}`);
    }
    // Conditional write: only move if the status is still what we just read, so two
    // concurrent sales of the same device can't both succeed (count 0 = lost the race).
    const result = await tx.item.updateMany({
      where: { id: itemId, status: item.status },
      data: { status: to },
    });
    if (result.count === 0) throw new ConflictException('Item changed, try again');
  }

  // ── helpers ──────────────────────────────────────────────

  /** 403 if a non-manage_prices user sends any price, unless the caller opted in (walk-in). */
  private assertPriceGate(dto: CreateItemDto, actor: PublicUser, opts: ReceiveOpts) {
    if (opts.allowPriceWithoutPermission) return;
    if (
      !hasPermission(actor, 'manage_prices') &&
      (dto.purchasePrice || dto.salePrice || dto.minSalePrice)
    ) {
      throw new ForbiddenException('Setting prices requires the manage_prices permission');
    }
  }

  /** Writes one 'update' AuditLog row for an item with its before/after snapshots. */
  private async logUpdate(tx: Tx, id: number, actor: PublicUser, before: object, after: object) {
    await this.audit.log(
      { userId: actor.id, action: 'update', entity: 'Item', entityId: id, before, after },
      tx,
    );
  }
}
