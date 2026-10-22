import { BadRequestException, ConflictException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { TransfersService } from './transfers.service';

const actor = { id: 7 } as PublicUser;

const detailRow = {
  id: 1,
  date: new Date(),
  note: null,
  fromLocation: { id: 1, name: 'A' },
  toLocation: { id: 2, name: 'B' },
  user: { id: 7, name: 'Me' },
  items: [],
  accessories: [],
};

describe('TransfersService', () => {
  const item = { findMany: jest.fn(), updateMany: jest.fn() };
  const accessoryStock = { updateMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() };
  const location = { findUnique: jest.fn() };
  const transfer = { create: jest.fn() };
  const tx = { item, accessoryStock, location, transfer };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new TransfersService(prisma, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    location.findUnique.mockResolvedValue({ isActive: true });
    transfer.create.mockResolvedValue(detailRow);
    item.updateMany.mockResolvedValue({ count: 1 });
    accessoryStock.updateMany.mockResolvedValue({ count: 1 });
  });

  const create = (dto: Partial<Parameters<TransfersService['create']>[0]>) =>
    service.create({ fromLocationId: 1, toLocationId: 2, ...dto }, actor);

  it('rejects same source and destination', async () => {
    await expect(create({ toLocationId: 1, itemIds: [5] })).rejects.toThrow(BadRequestException);
  });

  it('rejects an empty transfer', async () => {
    await expect(create({ itemIds: [], accessories: [] })).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate item ids', async () => {
    await expect(create({ itemIds: [5, 5] })).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate accessory product models', async () => {
    await expect(
      create({ accessories: [{ productModelId: 3, quantity: 1 }, { productModelId: 3, quantity: 2 }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an item not in stock at the source', async () => {
    item.findMany.mockResolvedValue([{ id: 5, status: ItemStatus.SOLD, locationId: 1 }]);
    await expect(create({ itemIds: [5] })).rejects.toThrow(/#5 is not in stock/);
  });

  it('rejects an item in stock at a different location', async () => {
    item.findMany.mockResolvedValue([{ id: 5, status: ItemStatus.IN_STOCK, locationId: 9 }]);
    await expect(create({ itemIds: [5] })).rejects.toThrow(/#5 is not in stock/);
  });

  it('moves items: guarded updateMany to the destination and audits once', async () => {
    item.findMany.mockResolvedValue([{ id: 5, status: ItemStatus.IN_STOCK, locationId: 1 }]);
    await create({ itemIds: [5] });
    expect(item.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [5] }, status: ItemStatus.IN_STOCK, locationId: 1 },
      data: { locationId: 2 },
    });
    expect(audit.log).toHaveBeenCalledTimes(1);
  });

  it('rejects when an item changed concurrently (count mismatch → 409)', async () => {
    item.findMany.mockResolvedValue([{ id: 5, status: ItemStatus.IN_STOCK, locationId: 1 }]);
    item.updateMany.mockResolvedValue({ count: 0 }); // someone moved it between read and write
    await expect(create({ itemIds: [5] })).rejects.toThrow(ConflictException);
  });

  it('rejects an accessory line with insufficient source stock (count 0 → 400)', async () => {
    accessoryStock.updateMany.mockResolvedValue({ count: 0 });
    await expect(create({ accessories: [{ productModelId: 3, quantity: 5 }] })).rejects.toThrow(
      /#3 at the source/,
    );
  });

  it('moves an accessory line: source minus, target plus, avgCost re-averaged', async () => {
    accessoryStock.findUnique
      .mockResolvedValueOnce({ avgCost: new Prisma.Decimal('100') }) // source avgCost (read after decrement)
      .mockResolvedValueOnce({ quantity: 10, avgCost: new Prisma.Decimal('200') }); // target
    await create({ accessories: [{ productModelId: 3, quantity: 5 }] });

    expect(accessoryStock.updateMany).toHaveBeenCalledWith({
      where: { productModelId: 3, locationId: 1, quantity: { gte: 5 } },
      data: { quantity: { decrement: 5 } },
    });
    const upsert = accessoryStock.upsert.mock.calls[0][0];
    expect(upsert.update.quantity).toEqual({ increment: 5 });
    // (10*200 + 5*100) / 15 = 166.67
    expect((upsert.update.avgCost as Prisma.Decimal).toFixed(2)).toBe('166.67');
  });
});
