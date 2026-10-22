import { ItemStatus, Prisma, ShareType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

const actor = (permissions: string[]): PublicUser =>
  ({ id: 5, role: { permissions } }) as unknown as PublicUser;

const device = {
  id: 7,
  status: ItemStatus.IN_STOCK,
  locationId: 1,
  productModelId: 3,
  purchasePrice: new Prisma.Decimal('1000'),
  extraCost: new Prisma.Decimal('0'),
  minSalePrice: new Prisma.Decimal('1400'),
  investorId: 9,
  investor: { id: 9, name: 'S', code: 'S', shareType: ShareType.NONE, shareValue: new Prisma.Decimal('0') },
};

// A detail row shaped enough for toSale() to map an empty sale.
const detailRow = {
  id: 1,
  createdAt: new Date(),
  status: 'PAID',
  dueDate: null,
  total: new Prisma.Decimal('1500'),
  customer: null,
  location: { id: 1, name: 'Shop' },
  seller: { id: 5, name: 'E2E' },
  items: [],
  payments: [],
  returns: [],
};

function build() {
  const changeStatus = jest.fn();
  const tx = {
    location: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
    item: { findUnique: jest.fn().mockResolvedValue(device) },
    productModel: { findUnique: jest.fn().mockResolvedValue({ category: { isSerialized: false } }) },
    accessoryStock: {
      findUnique: jest.fn().mockResolvedValue({ avgCost: new Prisma.Decimal('10') }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    sale: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(detailRow),
    },
    saleItem: { createMany: jest.fn() },
    salePayment: { create: jest.fn() },
  };
  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const items = { changeStatus } as unknown as ItemsService;
  return { service: new SalesService(prisma, audit, items), tx, changeStatus };
}

describe('SalesService.create', () => {
  it('requires a customer for a debt sale (FR-21)', async () => {
    const { service } = build();
    const dto: CreateSaleDto = {
      locationId: 1,
      lines: [{ productModelId: 3, quantity: 1, unitPrice: '25' }],
    };
    await expect(service.create(dto, actor(['sell']))).rejects.toThrow('A debt sale needs a customer');
  });

  it('a full cash payment marks the device SOLD (BR-9)', async () => {
    const { service, changeStatus } = build();
    const dto: CreateSaleDto = {
      locationId: 1,
      lines: [{ itemId: 7, unitPrice: '1500' }],
      payment: { amount: '1500', method: 'CASH' },
    };
    await service.create(dto, actor(['sell', 'manage_prices']));
    expect(changeStatus).toHaveBeenCalledWith(expect.anything(), 7, ItemStatus.SOLD);
  });

  it('rejects a payment larger than the total', async () => {
    const { service } = build();
    const dto: CreateSaleDto = {
      locationId: 1,
      lines: [{ itemId: 7, unitPrice: '1500' }],
      payment: { amount: '2000', method: 'CASH' },
    };
    await expect(service.create(dto, actor(['sell', 'manage_prices']))).rejects.toThrow('cannot exceed');
  });

  it('rejects two lines of the same accessory model (would oversell)', async () => {
    const { service } = build();
    const dto: CreateSaleDto = {
      locationId: 1,
      customerId: 2,
      lines: [
        { productModelId: 3, quantity: 1, unitPrice: '20' },
        { productModelId: 3, quantity: 1, unitPrice: '20' },
      ],
    };
    await expect(service.create(dto, actor(['sell']))).rejects.toThrow('same product model');
  });

  it('400s when the atomic decrement finds too little stock', async () => {
    const { service, tx } = build();
    (tx.accessoryStock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const dto: CreateSaleDto = {
      locationId: 1,
      customerId: 2,
      lines: [{ productModelId: 3, quantity: 99, unitPrice: '20' }],
      payment: { amount: '1980', method: 'CASH' },
    };
    await expect(service.create(dto, actor(['sell']))).rejects.toThrow('Not enough stock');
  });
});
