import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { AccessoryStockService } from './accessory-stock.service';

const user = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;

const stockRow = {
  id: 1,
  quantity: 20,
  avgCost: new Prisma.Decimal('150'),
  productModel: { id: 1, name: 'Charger', category: { id: 2, name: 'Accessory' } },
  location: { id: 1, name: 'Shop' },
};

describe('AccessoryStockService', () => {
  const productModel = { findUnique: jest.fn() };
  const location = { findUnique: jest.fn() };
  const accessoryStock = { findUnique: jest.fn(), upsert: jest.fn() };
  const purchaseLine = { create: jest.fn() };
  const tx = { productModel, location, accessoryStock, purchaseLine };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new AccessoryStockService(prisma, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    productModel.findUnique.mockResolvedValue({ category: { isSerialized: false } });
    location.findUnique.mockResolvedValue({ isActive: true });
    accessoryStock.upsert.mockResolvedValue(stockRow);
  });

  it('blends avgCost with the contract formula', async () => {
    accessoryStock.findUnique.mockResolvedValue({ quantity: 10, avgCost: new Prisma.Decimal('100') });
    await service.create(
      { productModelId: 1, locationId: 1, quantity: 10, unitCost: '200' },
      user(['manage_prices']),
    );
    // (10*100 + 10*200) / 20 = 150
    const avgCost = accessoryStock.upsert.mock.calls[0][0].update.avgCost as Prisma.Decimal;
    expect(avgCost.toFixed(2)).toBe('150.00');
  });

  it('leaves avgCost unchanged and buys in at current avgCost without unitCost', async () => {
    accessoryStock.findUnique.mockResolvedValue({ quantity: 10, avgCost: new Prisma.Decimal('100') });
    await service.create({ productModelId: 1, locationId: 1, quantity: 5 }, user(['receive_batch']));
    const avgCost = accessoryStock.upsert.mock.calls[0][0].update.avgCost as Prisma.Decimal;
    expect(avgCost.toFixed(2)).toBe('100.00');
    const unitPrice = purchaseLine.create.mock.calls[0][0].data.unitPrice as Prisma.Decimal;
    expect(unitPrice.toFixed(2)).toBe('100.00');
  });

  it('rejects a serialized category', async () => {
    productModel.findUnique.mockResolvedValue({ category: { isSerialized: true } });
    await expect(
      service.create({ productModelId: 1, locationId: 1, quantity: 1 }, user(['receive_batch'])),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unitCost without manage_prices', async () => {
    await expect(
      service.create(
        { productModelId: 1, locationId: 1, quantity: 1, unitCost: '10' },
        user(['receive_batch']),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
