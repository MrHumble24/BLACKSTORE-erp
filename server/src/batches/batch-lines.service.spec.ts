import { Prisma } from '@prisma/client';
import { AccessoryStockService } from '../accessory-stock/accessory-stock.service';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { BatchLinesService } from './batch-lines.service';

const actor = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;

describe('BatchLinesService.updateLine (accessory avgCost)', () => {
  const purchaseLine = { findUnique: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn() };
  const item = { update: jest.fn() };
  const batch = { findUniqueOrThrow: jest.fn() };
  const accessoryStock = { findUnique: jest.fn(), update: jest.fn() };
  const tx = { purchaseLine, item, batch, accessoryStock };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const items = {} as unknown as ItemsService;
  const accessories = {} as unknown as AccessoryStockService;
  const service = new BatchLinesService(prisma, audit, items, accessories);

  beforeEach(() => jest.clearAllMocks());

  it('adjusts avgCost by (new − old) × quantity / currentQuantity', async () => {
    purchaseLine.findUnique.mockResolvedValue({
      id: 5, batchId: 1, itemId: null, productModelId: 3, quantity: 4, unitPrice: new Prisma.Decimal('10'),
    });
    // Both adjustAvgCost and applyResplit read the batch; one mock serves both selects.
    batch.findUniqueOrThrow.mockResolvedValue({
      locationId: 2, extraCostTotal: new Prisma.Decimal('0'), costSplitMethod: 'NONE',
    });
    accessoryStock.findUnique.mockResolvedValue({ id: 8, quantity: 10, avgCost: new Prisma.Decimal('10') });
    purchaseLine.findMany.mockResolvedValue([]); // no device lines to re-split
    purchaseLine.findUniqueOrThrow.mockResolvedValue({
      id: 5, quantity: 4, unitPrice: new Prisma.Decimal('15'), extraCost: new Prisma.Decimal('0'),
      item: null, productModel: { id: 3, name: 'Charger', category: { id: 2, name: 'Accessory' } },
    });

    await service.updateLine(1, 5, { unitPrice: '15' }, actor(['manage_prices', 'view_cost']));
    // (15 − 10) × 4 / 10 = 2 → 10 + 2 = 12.00
    expect(accessoryStock.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { avgCost: new Prisma.Decimal('12.00') },
    });
    expect(item.update).not.toHaveBeenCalled();
  });

  it('skips the avgCost adjustment when the stock row is empty', async () => {
    purchaseLine.findUnique.mockResolvedValue({
      id: 5, batchId: 1, itemId: null, productModelId: 3, quantity: 4, unitPrice: new Prisma.Decimal('10'),
    });
    batch.findUniqueOrThrow.mockResolvedValue({
      locationId: 2, extraCostTotal: new Prisma.Decimal('0'), costSplitMethod: 'NONE',
    });
    accessoryStock.findUnique.mockResolvedValue({ id: 8, quantity: 0, avgCost: new Prisma.Decimal('10') });
    purchaseLine.findMany.mockResolvedValue([]);
    purchaseLine.findUniqueOrThrow.mockResolvedValue({
      id: 5, quantity: 4, unitPrice: new Prisma.Decimal('15'), extraCost: new Prisma.Decimal('0'),
      item: null, productModel: { id: 3, name: 'Charger', category: { id: 2, name: 'Accessory' } },
    });

    await service.updateLine(1, 5, { unitPrice: '15' }, actor(['manage_prices']));
    expect(accessoryStock.update).not.toHaveBeenCalled();
  });
});
