import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { IdentifierType, ItemCondition, ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { ItemSortBy, SortOrder } from './dto/query-items.dto';
import { ItemsService } from './items.service';
import {
  assertHasPrimaryIdentifier,
  assertIdentifierCaps,
  validateAttributes,
  validateIdentifier,
} from './item-validation';
import { toItem, type ItemRow } from './item-shape';

const user = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;

describe('item-validation', () => {
  const defs = [
    { key: 'ram', type: 'SELECT' as const, options: ['8GB', '16GB'], required: true },
    { key: 'weight', type: 'NUMBER' as const, options: [], required: false },
  ];

  it('rejects an unknown attribute key', () => {
    expect(() => validateAttributes({ color: 'red' }, defs)).toThrow(BadRequestException);
  });

  it('rejects a missing required attribute', () => {
    expect(() => validateAttributes({}, defs)).toThrow(BadRequestException);
  });

  it('rejects a SELECT value not in options', () => {
    expect(() => validateAttributes({ ram: '4GB' }, defs)).toThrow(BadRequestException);
  });

  it('rejects a NUMBER value that is not numeric', () => {
    expect(() => validateAttributes({ ram: '8GB', weight: '200' }, defs)).toThrow(
      BadRequestException,
    );
  });

  it('accepts a valid attribute map and drops absent optionals', () => {
    expect(validateAttributes({ ram: '16GB' }, defs)).toEqual({ ram: '16GB' });
  });

  it('normalizes and validates an IMEI of 15 digits', () => {
    expect(validateIdentifier(IdentifierType.IMEI, ' 356789012345670 ')).toBe('356789012345670');
    expect(() => validateIdentifier(IdentifierType.IMEI, '123')).toThrow(BadRequestException);
  });

  it('upper-cases a SERIAL and enforces the charset', () => {
    expect(validateIdentifier(IdentifierType.SERIAL, 'abc-123')).toBe('ABC-123');
    expect(() => validateIdentifier(IdentifierType.SERIAL, 'ab')).toThrow(BadRequestException);
  });

  it('needs at least one IMEI or SERIAL', () => {
    expect(() => assertHasPrimaryIdentifier([IdentifierType.SYSTEM_CODE])).toThrow(
      BadRequestException,
    );
    expect(() => assertHasPrimaryIdentifier([IdentifierType.IMEI])).not.toThrow();
  });

  it('caps identifiers at 2 IMEI, 1 SERIAL, 1 SYSTEM_CODE', () => {
    expect(() =>
      assertIdentifierCaps([IdentifierType.IMEI, IdentifierType.IMEI, IdentifierType.IMEI], []),
    ).toThrow(BadRequestException);
    expect(() =>
      assertIdentifierCaps([IdentifierType.SERIAL], [IdentifierType.SERIAL]),
    ).toThrow(BadRequestException);
    expect(() =>
      assertIdentifierCaps([IdentifierType.IMEI], [IdentifierType.IMEI]),
    ).not.toThrow();
  });
});

describe('toItem cost visibility', () => {
  const row = {
    id: 7,
    status: ItemStatus.IN_STOCK,
    condition: 'NEW',
    attributes: {},
    salePrice: new Prisma.Decimal('1500'),
    minSalePrice: new Prisma.Decimal('1400'),
    purchasePrice: new Prisma.Decimal('1000'),
    extraCost: new Prisma.Decimal('50'),
    createdAt: new Date(),
    updatedAt: new Date(),
    productModel: { id: 1, name: 'iPhone', category: { id: 1, name: 'Phone' } },
    investor: { id: 1, name: 'Own', code: 'OWN', isOwn: null },
    location: { id: 1, name: 'Shop', type: 'SHOP' },
    identifiers: [],
  } as unknown as ItemRow;

  it('hides cost fields without view_cost and defaults isOwn to false', () => {
    const shaped = toItem(row, false) as Record<string, unknown>;
    expect(shaped).not.toHaveProperty('purchasePrice');
    expect(shaped).not.toHaveProperty('cost');
    expect((shaped.investor as { isOwn: boolean }).isOwn).toBe(false);
  });

  it('shows cost = purchasePrice + extraCost with view_cost', () => {
    const shaped = toItem(row, true) as Record<string, string>;
    expect(shaped.purchasePrice).toBe('1000.00');
    expect(shaped.cost).toBe('1050.00');
  });
});

describe('ItemsService', () => {
  const item = { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const purchaseLine = { findFirst: jest.fn(), update: jest.fn() };
  const tx = { item, purchaseLine };
  const prisma = {
    item,
    purchaseLine,
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new ItemsService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  it('changeStatus allows IN_STOCK → SOLD with a conditional write', async () => {
    item.findUnique.mockResolvedValue({ status: ItemStatus.IN_STOCK });
    item.updateMany.mockResolvedValue({ count: 1 });
    await service.changeStatus(tx as unknown as Prisma.TransactionClient, 1, ItemStatus.SOLD);
    // The write is guarded on the status we just read, so a concurrent sale can't double-move it.
    expect(item.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: ItemStatus.IN_STOCK },
      data: { status: ItemStatus.SOLD },
    });
  });

  it('changeStatus throws 409 when the item changed under us (count 0)', async () => {
    item.findUnique.mockResolvedValue({ status: ItemStatus.IN_STOCK });
    item.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.changeStatus(tx as unknown as Prisma.TransactionClient, 1, ItemStatus.SOLD),
    ).rejects.toThrow(ConflictException);
  });

  it('changeStatus blocks SOLD → AT_PARTNER', async () => {
    item.findUnique.mockResolvedValue({ status: ItemStatus.SOLD });
    await expect(
      service.changeStatus(tx as unknown as Prisma.TransactionClient, 1, ItemStatus.AT_PARTNER),
    ).rejects.toThrow(BadRequestException);
    expect(item.updateMany).not.toHaveBeenCalled();
  });

  it('blocks Staff from editing a SOLD item (past record)', async () => {
    item.findUnique.mockResolvedValue({
      status: ItemStatus.SOLD,
      identifiers: [],
      productModel: { category: { attributes: [] } },
    });
    await expect(
      service.update(1, { condition: 'USED' }, user(['receive_batch'])),
    ).rejects.toThrow(ForbiddenException);
    expect(item.update).not.toHaveBeenCalled();
  });

  it('updatePrices never touches a batch PurchaseLine (supplier ledger, BR-8)', async () => {
    item.findUnique.mockResolvedValue({
      status: ItemStatus.IN_STOCK,
      salePrice: null,
      minSalePrice: null,
      identifiers: [],
      productModel: { category: { attributes: [] } },
    });
    item.update.mockResolvedValue({
      id: 1,
      status: ItemStatus.IN_STOCK,
      condition: 'NEW',
      attributes: {},
      salePrice: null,
      minSalePrice: null,
      purchasePrice: new Prisma.Decimal('900'),
      extraCost: new Prisma.Decimal('0'),
      createdAt: new Date(),
      updatedAt: new Date(),
      productModel: { id: 1, name: 'iPhone', category: { id: 1, name: 'Phone' } },
      investor: { id: 1, name: 'Own', code: 'OWN', isOwn: true },
      location: { id: 1, name: 'Shop', type: 'SHOP' },
      identifiers: [],
    });
    // Item's only line is a batch line, so the batchId-null query matches nothing.
    purchaseLine.findFirst.mockResolvedValue(null);
    await service.updatePrices(1, { purchasePrice: '900' }, user(['manage_prices']));
    expect(purchaseLine.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1, batchId: null } }),
    );
    expect(purchaseLine.update).not.toHaveBeenCalled();
  });
});

describe('ItemsService.setSystemCode (FR-15)', () => {
  const item = { findUnique: jest.fn() };
  const itemIdentifier = { create: jest.fn() };
  const tx = { item, itemIdentifier };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new ItemsService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  it('creates BS- + id padded to 6 digits the first time (201)', async () => {
    item.findUnique.mockResolvedValue({ status: ItemStatus.IN_STOCK, identifiers: [] });
    itemIdentifier.create.mockResolvedValue({ id: 1, type: IdentifierType.SYSTEM_CODE, value: 'BS-000042' });
    const result = await service.setSystemCode(42, user(['receive_batch']));
    expect(itemIdentifier.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: 'BS-000042' }) }),
    );
    expect(result).toEqual({
      identifier: { id: 1, type: IdentifierType.SYSTEM_CODE, value: 'BS-000042' },
      created: true,
    });
  });

  it('returns the existing code without creating a new one (idempotent, 200)', async () => {
    const existing = { id: 1, type: IdentifierType.SYSTEM_CODE, value: 'BS-000042' };
    item.findUnique.mockResolvedValue({ status: ItemStatus.IN_STOCK, identifiers: [existing] });
    const result = await service.setSystemCode(42, user(['receive_batch']));
    expect(itemIdentifier.create).not.toHaveBeenCalled();
    expect(result).toEqual({ identifier: existing, created: false });
  });
});

describe('ItemsService.findAll (sorting and filtering)', () => {
  const item = { findMany: jest.fn(), count: jest.fn() };
  const prisma = {
    $transaction: (promises: Promise<unknown>[]) => Promise.all(promises),
    item,
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new ItemsService(prisma, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    item.findMany.mockResolvedValue([]);
    item.count.mockResolvedValue(0);
  });

  it('filters by condition and unpriced flag', async () => {
    await service.findAll(
      { page: 1, pageSize: 20, condition: ItemCondition.USED, isUnpriced: true },
      user(['view_stock']),
    );
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ condition: ItemCondition.USED, salePrice: null }),
      }),
    );
  });

  it('sorts by sale price in ascending order', async () => {
    await service.findAll(
      { page: 1, pageSize: 20, sortBy: ItemSortBy.SALE_PRICE, sortOrder: SortOrder.ASC },
      user(['view_stock']),
    );
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ salePrice: 'asc' }, { id: 'desc' }],
      }),
    );
  });
});


