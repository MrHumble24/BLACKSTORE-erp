import { ItemStatus, Prisma, ShareType } from '@prisma/client';
import { CreateSaleLineDto } from './dto/create-sale.dto';
import { buildLine } from './sale-create';

type Tx = Prisma.TransactionClient;

// A device IN_STOCK at location 1, owned by a PERCENT investor, min price 1400.
const device = {
  id: 7,
  status: ItemStatus.IN_STOCK,
  locationId: 1,
  productModelId: 3,
  purchasePrice: new Prisma.Decimal('1000'),
  extraCost: new Prisma.Decimal('50'),
  minSalePrice: new Prisma.Decimal('1400'),
  investorId: 9,
  investor: { id: 9, name: 'Sardor', code: 'S', shareType: ShareType.PERCENT, shareValue: new Prisma.Decimal('30') },
};

const mockTx = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    item: { findUnique: jest.fn().mockResolvedValue(device) },
    productModel: { findUnique: jest.fn().mockResolvedValue({ category: { isSerialized: false } }) },
    accessoryStock: {
      findUnique: jest.fn().mockResolvedValue({ quantity: 5, avgCost: new Prisma.Decimal('10') }),
    },
    ...overrides,
  }) as unknown as Tx;

describe('buildLine (sale lines)', () => {
  it('rejects a line that is neither a device nor an accessory', async () => {
    await expect(buildLine(mockTx(), { unitPrice: '10' } as CreateSaleLineDto, 1, true)).rejects.toThrow(
      'exactly one',
    );
  });

  describe('device line (FR-20 minimum price, BR-7 snapshot)', () => {
    const line: CreateSaleLineDto = { itemId: 7, unitPrice: '1300' }; // below the 1400 floor

    it('refuses Staff below the minimum price', async () => {
      await expect(buildLine(mockTx(), line, 1, false)).rejects.toThrow('Below minimum price');
    });

    it('lets a manage_prices user sell below the floor and snapshots cost + investor share', async () => {
      const built = await buildLine(mockTx(), line, 1, true);
      expect(built.data.unitCost?.toString()).toBe('1050'); // purchasePrice + extraCost
      expect(built.data.investorId).toBe(9);
      expect(built.data.shareType).toBe(ShareType.PERCENT);
      expect(built.data.shareValue?.toString()).toBe('30');
      expect(built.moveItemId).toBe(7);
      expect(built.lineTotal.toString()).toBe('1300');
    });

    it('rejects an item that is not in stock', async () => {
      const tx = mockTx({ item: { findUnique: jest.fn().mockResolvedValue({ ...device, status: ItemStatus.SOLD }) } });
      await expect(buildLine(tx, { itemId: 7, unitPrice: '1500' }, 1, true)).rejects.toThrow('not in stock');
    });

    it('rejects an item at another location', async () => {
      await expect(buildLine(mockTx(), { itemId: 7, unitPrice: '1500' }, 2, true)).rejects.toThrow(
        'not at this location',
      );
    });
  });

  describe('accessory line (FR-4 stock, BR-7 snapshot)', () => {
    const line: CreateSaleLineDto = { productModelId: 3, quantity: 2, unitPrice: '25' };

    it('snapshots avgCost with no investor share and flags the decrement', async () => {
      const built = await buildLine(mockTx(), line, 1, false);
      expect(built.data.unitCost?.toString()).toBe('10'); // avgCost
      expect(built.data.investorId).toBeNull();
      expect(built.data.shareType).toBe(ShareType.NONE);
      expect(built.lineTotal.toString()).toBe('50'); // 25 × 2
      expect(built.decrement).toEqual({ productModelId: 3, locationId: 1, quantity: 2 });
    });

    it('rejects a model with no stock row at the location', async () => {
      const tx = mockTx({ accessoryStock: { findUnique: jest.fn().mockResolvedValue(null) } });
      await expect(buildLine(tx, line, 1, false)).rejects.toThrow('no stock');
    });
  });
});
