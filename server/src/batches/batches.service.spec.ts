import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { toBatchLine } from './batch-shape';
import { BatchesService } from './batches.service';

const admin = {
  id: 1,
  role: { permissions: ['manage_prices', 'view_cost'] },
} as unknown as PublicUser;

// before = a recent batch with no extra cost split yet (NONE / 0).
const before = {
  id: 1,
  arrivalDate: new Date(),
  extraCostTotal: new Prisma.Decimal('0'),
  costSplitMethod: 'NONE',
  lines: [],
};

describe('BatchesService.update (extra cost split)', () => {
  const batch = {
    findUnique: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  };
  const purchaseLine = { findMany: jest.fn() };
  const tx = { batch, purchaseLine };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new BatchesService(prisma, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    batch.findUnique.mockResolvedValue(before);
  });

  it('refuses a positive extra cost with split NONE', async () => {
    await expect(
      service.update(
        1,
        { extraCostTotal: '100', costSplitMethod: 'NONE' },
        admin,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(batch.update).not.toHaveBeenCalled();
  });

  it('refuses a positive total even when only the method is sent (stays NONE via current)', async () => {
    batch.findUnique.mockResolvedValue({
      ...before,
      extraCostTotal: new Prisma.Decimal('100'),
    });
    await expect(
      service.update(1, { costSplitMethod: 'NONE' }, admin),
    ).rejects.toThrow('Choose how to split the extra cost');
  });

  it('allows a positive total with a real split method', async () => {
    batch.findUniqueOrThrow.mockResolvedValue({
      ...before,
      extraCostTotal: new Prisma.Decimal('100'),
      costSplitMethod: 'EQUAL',
      note: null,
      supplier: { id: 1, name: 'Sup' },
      investor: { id: 1, name: 'Own', code: 'OWN', isOwn: true },
      location: { id: 1, name: 'Sklad' },
    });
    purchaseLine.findMany.mockResolvedValue([]);
    await expect(
      service.update(
        1,
        { extraCostTotal: '100', costSplitMethod: 'EQUAL' },
        admin,
      ),
    ).resolves.toBeDefined();
    expect(batch.update).toHaveBeenCalled();
  });
});

describe('toBatchLine (device line shape)', () => {
  const model = {
    id: 2,
    name: 'iPhone 15',
    category: { id: 1, name: 'Phone' },
  };
  const item = {
    id: 9,
    status: 'IN_STOCK',
    salePrice: new Prisma.Decimal('650'),
    identifiers: [],
    productModel: model,
  };
  const line = {
    id: 7,
    quantity: 1,
    unitPrice: new Prisma.Decimal('500'),
    extraCost: new Prisma.Decimal('0'),
    productModel: null,
    item,
  } as unknown as Parameters<typeof toBatchLine>[0];

  it('includes salePrice for staff but hides cost keys', () => {
    const out = toBatchLine(line, false);
    expect(out.item).toEqual({
      id: 9,
      status: 'IN_STOCK',
      salePrice: '650.00',
      identifiers: [],
    });
    expect(out).not.toHaveProperty('unitPrice');
    expect(out).not.toHaveProperty('extraCost');
  });

  it('returns null salePrice when none is set', () => {
    const noPrice = { ...line, item: { ...item, salePrice: null } };
    expect(toBatchLine(noPrice, true).item?.salePrice).toBeNull();
  });
});
