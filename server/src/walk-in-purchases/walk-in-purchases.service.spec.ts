import { BadRequestException, ConflictException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalkInPurchaseDto } from './dto/create-walk-in-purchase.dto';
import { WalkInPurchasesService } from './walk-in-purchases.service';

const actor = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;

const baseDto = (): CreateWalkInPurchaseDto => ({
  seller: { name: 'Ali', phone: '+998901112233' },
  productModelId: 7,
  locationId: 2,
  identifiers: [{ type: 'IMEI', value: '356789012345670' }],
  condition: 'USED',
  pricePaid: '500',
});

const soldItemRow = () => ({
  id: 42,
  productModelId: 7,
  status: ItemStatus.SOLD,
  identifiers: [{ id: 1, type: 'IMEI', value: '356789012345670' }],
  productModel: { id: 7, name: 'iPhone', category: { id: 1, name: 'iPhone', attributes: [] } },
});

const mappableRow = () => ({
  id: 42,
  status: ItemStatus.IN_STOCK,
  condition: 'USED',
  attributes: {},
  salePrice: null,
  minSalePrice: null,
  purchasePrice: new Prisma.Decimal('500'),
  extraCost: new Prisma.Decimal('0'),
  createdAt: new Date(),
  updatedAt: new Date(),
  productModel: { id: 7, name: 'iPhone', category: { id: 1, name: 'iPhone' } },
  investor: { id: 1, name: 'Own', code: 'OWN', isOwn: true },
  location: { id: 2, name: 'Shop', type: 'SHOP' },
  identifiers: [],
});

describe('WalkInPurchasesService', () => {
  const itemIdentifier = { findFirst: jest.fn(), create: jest.fn() };
  const walkInSeller = { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() };
  const investor = { findFirstOrThrow: jest.fn(), findUnique: jest.fn() };
  const location = { findUnique: jest.fn() };
  const item = { findUniqueOrThrow: jest.fn(), update: jest.fn() };
  const purchaseLine = { create: jest.fn() };
  const tx = { itemIdentifier, walkInSeller, investor, location, item, purchaseLine };
  const prisma = {
    itemIdentifier,
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const items = { receiveDevice: jest.fn(), changeStatus: jest.fn() } as unknown as ItemsService;
  const service = new WalkInPurchasesService(prisma, audit, items);

  beforeEach(() => jest.clearAllMocks());

  it('reuses a seller matched by phone and passes its id as the purchase source', async () => {
    itemIdentifier.findFirst.mockResolvedValue(null);
    walkInSeller.findFirst.mockResolvedValue({ id: 9 });
    investor.findFirstOrThrow.mockResolvedValue({ id: 1 });
    await service.create(baseDto(), actor(['buy_walk_in']));
    expect(walkInSeller.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { name: 'Ali' } });
    expect(walkInSeller.create).not.toHaveBeenCalled();
    expect(items.receiveDevice).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ investorId: 1, locationId: 2, purchasePrice: '500' }),
      expect.anything(),
      { source: { walkInSellerId: 9 }, allowPriceWithoutPermission: true },
    );
  });

  it('defaults the owner to the isOwn investor when none is given', async () => {
    itemIdentifier.findFirst.mockResolvedValue(null);
    walkInSeller.findFirst.mockResolvedValue(null);
    walkInSeller.create.mockResolvedValue({ id: 5 });
    investor.findFirstOrThrow.mockResolvedValue({ id: 99 });
    await service.create(baseDto(), actor(['buy_walk_in']));
    expect(investor.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isOwn: true } }),
    );
    expect(items.receiveDevice).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ investorId: 99 }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('buys back a SOLD item: status→IN_STOCK, price reset, a second purchase line', async () => {
    itemIdentifier.findFirst.mockResolvedValue({
      type: 'IMEI',
      value: '356789012345670',
      itemId: 42,
      item: { status: ItemStatus.SOLD },
    });
    item.findUniqueOrThrow.mockResolvedValue(soldItemRow());
    walkInSeller.findFirst.mockResolvedValue({ id: 9 });
    investor.findFirstOrThrow.mockResolvedValue({ id: 1 });
    investor.findUnique.mockResolvedValue({ isActive: true });
    location.findUnique.mockResolvedValue({ isActive: true });
    item.update.mockResolvedValue(mappableRow());

    const result = (await service.create(baseDto(), actor(['buy_walk_in', 'view_cost']))) as {
      id: number;
      purchasePrice: string;
    };
    expect(items.changeStatus).toHaveBeenCalledWith(tx, 42, ItemStatus.IN_STOCK);
    expect(item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({ purchasePrice: new Prisma.Decimal('500'), salePrice: null }),
      }),
    );
    expect(purchaseLine.create).toHaveBeenCalledWith({
      data: { itemId: 42, walkInSellerId: 9, quantity: 1, unitPrice: new Prisma.Decimal('500') },
    });
    expect(result.purchasePrice).toBe('500.00');
  });

  it('rejects a buy-back into an inactive location with 400', async () => {
    itemIdentifier.findFirst.mockResolvedValue({
      type: 'IMEI',
      value: '356789012345670',
      itemId: 42,
      item: { status: ItemStatus.SOLD },
    });
    item.findUniqueOrThrow.mockResolvedValue(soldItemRow());
    walkInSeller.findFirst.mockResolvedValue({ id: 9 });
    investor.findFirstOrThrow.mockResolvedValue({ id: 1 });
    investor.findUnique.mockResolvedValue({ isActive: true });
    location.findUnique.mockResolvedValue({ isActive: false });
    await expect(service.create(baseDto(), actor(['buy_walk_in']))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a buy-back that would exceed the IMEI cap with 400', async () => {
    const dto = {
      ...baseDto(),
      identifiers: [
        { type: 'IMEI' as const, value: '356789012345670' },
        { type: 'IMEI' as const, value: '356789012345671' },
        { type: 'IMEI' as const, value: '356789012345672' },
      ],
    };
    itemIdentifier.findFirst.mockResolvedValue({
      type: 'IMEI',
      value: '356789012345670',
      itemId: 42,
      item: { status: ItemStatus.SOLD },
    });
    item.findUniqueOrThrow.mockResolvedValue(soldItemRow());
    walkInSeller.findFirst.mockResolvedValue({ id: 9 });
    investor.findFirstOrThrow.mockResolvedValue({ id: 1 });
    investor.findUnique.mockResolvedValue({ isActive: true });
    location.findUnique.mockResolvedValue({ isActive: true });
    item.update.mockResolvedValue(mappableRow());
    await expect(service.create(dto, actor(['buy_walk_in']))).rejects.toThrow(BadRequestException);
  });

  it('rejects a known identifier on a non-SOLD item with 409 naming the status', async () => {
    itemIdentifier.findFirst.mockResolvedValue({
      type: 'IMEI',
      value: '356789012345670',
      itemId: 42,
      item: { status: ItemStatus.IN_STOCK },
    });
    await expect(service.create(baseDto(), actor(['buy_walk_in']))).rejects.toThrow(
      ConflictException,
    );
    await expect(service.create(baseDto(), actor(['buy_walk_in']))).rejects.toThrow('(IN_STOCK)');
  });
});
