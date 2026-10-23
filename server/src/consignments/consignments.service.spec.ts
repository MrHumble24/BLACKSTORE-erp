import { BadRequestException } from '@nestjs/common';
import { ConsignmentItemStatus, ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsignmentsService } from './consignments.service';

const d = (v: string) => new Prisma.Decimal(v);
const actor = (permissions: string[]) => ({ id: 2, role: { permissions } }) as unknown as PublicUser;
const staff = actor(['consign']);
const admin = actor(['consign', 'manage_prices']);

/** A transaction client with one held item (floor 1200) and one in-stock item (floor 1200). */
function makeService() {
  const tx = {
    partner: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
    item: { findMany: jest.fn().mockResolvedValue([{ id: 100, status: ItemStatus.IN_STOCK, minSalePrice: d('1200') }]) },
    consignment: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, date: new Date(), dueDate: null, note: null, partner: null, handedBy: null, items: [] }),
    },
    consignmentItem: {
      createMany: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue({
        id: 5,
        itemId: 100,
        status: ConsignmentItemStatus.AT_PARTNER,
        minPrice: d('1300'),
        consignment: { dueDate: null },
        item: { minSalePrice: d('1200') },
      }),
      update: jest.fn().mockResolvedValue({ id: 5, minPrice: d('1000'), status: ConsignmentItemStatus.AT_PARTNER, soldAt: null, returnedAt: null, saleItem: null, item: {} }),
    },
  };
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const items = { changeStatus: jest.fn().mockResolvedValue(undefined) } as unknown as ItemsService;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  return { service: new ConsignmentsService(prisma, audit, items), tx };
}

describe('ConsignmentsService minPrice floor (FR-20)', () => {
  it('handover below minSalePrice without manage_prices → 400', async () => {
    const { service, tx } = makeService();
    const dto = { partnerId: 3, items: [{ itemId: 100, minPrice: '1000' }] };
    await expect(service.create(dto, staff)).rejects.toThrow(BadRequestException);
    expect(tx.consignmentItem.createMany).not.toHaveBeenCalled();
  });

  it('handover below minSalePrice with manage_prices → ok', async () => {
    const { service, tx } = makeService();
    await service.create({ partnerId: 3, items: [{ itemId: 100, minPrice: '1000' }] }, admin);
    expect(tx.consignmentItem.createMany).toHaveBeenCalled();
  });

  it('repricing below minSalePrice without manage_prices → 400', async () => {
    const { service, tx } = makeService();
    await expect(service.updateItemMinPrice(1, 5, { minPrice: '1000' }, staff)).rejects.toThrow('Below minimum price');
    expect(tx.consignmentItem.update).not.toHaveBeenCalled();
  });

  it('repricing below minSalePrice with manage_prices → ok', async () => {
    const { service } = makeService();
    const result = await service.updateItemMinPrice(1, 5, { minPrice: '1000' }, admin);
    expect(result.minPrice).toBe('1000.00');
  });
});
