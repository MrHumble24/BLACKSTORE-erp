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
  const batch = { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() };
  const accessoryStock = { findUnique: jest.fn(), update: jest.fn() };
  const tx = { purchaseLine, item, batch, accessoryStock };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const items = {} as unknown as ItemsService;
  const accessories = {} as unknown as AccessoryStockService;
  const service = new BatchLinesService(prisma, audit, items, accessories);

  beforeEach(() => {
    jest.clearAllMocks();
    // Recent batch so the lock check passes.
    batch.findUnique.mockResolvedValue({ arrivalDate: new Date() });
  });

  const mockAccessoryLine = (quantity: number, stockQty: number) => {
    purchaseLine.findUnique.mockResolvedValue({
      id: 5, batchId: 1, itemId: null, productModelId: 3, quantity, unitPrice: new Prisma.Decimal('10'),
    });
    // adjustAvgCost + applyResplit both read the batch via findUniqueOrThrow.
    batch.findUniqueOrThrow.mockResolvedValue({
      locationId: 2, extraCostTotal: new Prisma.Decimal('0'), costSplitMethod: 'NONE',
    });
    accessoryStock.findUnique.mockResolvedValue({ id: 8, quantity: stockQty, avgCost: new Prisma.Decimal('10') });
    purchaseLine.findMany.mockResolvedValue([]); // no device lines to re-split
    purchaseLine.findUniqueOrThrow.mockResolvedValue({
      id: 5, quantity, unitPrice: new Prisma.Decimal('15'), extraCost: new Prisma.Decimal('0'),
      item: null, productModel: { id: 3, name: 'Charger', category: { id: 2, name: 'Accessory' } },
    });
  };

  it('adjusts avgCost by (new − old) × quantity / currentQuantity', async () => {
    mockAccessoryLine(4, 10);
    await service.updateLine(1, 5, { unitPrice: '15' }, actor(['manage_prices', 'view_cost']));
    // (15 − 10) × min(4,10) / 10 = 2 → 10 + 2 = 12.00
    expect(accessoryStock.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { avgCost: new Prisma.Decimal('12.00') },
    });
    expect(item.update).not.toHaveBeenCalled();
  });

  it('caps the avgCost move at (new − old) when most units are already gone', async () => {
    // Bought 10 at 10, only 2 left; correct the price to 20.
    mockAccessoryLine(10, 2);
    await service.updateLine(1, 5, { unitPrice: '20' }, actor(['manage_prices']));
    // min(10,2)=2 → (20 − 10) × 2 / 2 = 10 → 10 + 10 = 20.00 (not the uncapped 60.00)
    expect(accessoryStock.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { avgCost: new Prisma.Decimal('20.00') },
    });
  });

  it('skips the avgCost adjustment when the stock row is empty', async () => {
    mockAccessoryLine(4, 0);
    await service.updateLine(1, 5, { unitPrice: '15' }, actor(['manage_prices']));
    expect(accessoryStock.update).not.toHaveBeenCalled();
  });
});
