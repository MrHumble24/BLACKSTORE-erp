import { Prisma } from '@prisma/client';
import { collectTargets } from './hard-delete-targets';

type Db = Parameters<typeof collectTargets>[0];

const emptyAggPay = { _count: 0, _sum: { amount: null } };
const emptyAggRet = { _count: 0, _sum: { refundAmount: null } };

/** Minimal Prisma-shaped stub; each test overrides the model methods it exercises. */
function db(over: Record<string, unknown>): Db {
  return {
    item: { findUnique: jest.fn().mockResolvedValue({ id: 1 }), findMany: jest.fn().mockResolvedValue([]) },
    productModel: { findUnique: jest.fn().mockResolvedValue({ id: 1 }), findMany: jest.fn().mockResolvedValue([]) },
    category: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    saleItem: { findMany: jest.fn().mockResolvedValue([]) },
    accessoryStock: { count: jest.fn().mockResolvedValue(0) },
    itemIdentifier: { count: jest.fn().mockResolvedValue(0) },
    sale: { findMany: jest.fn().mockResolvedValue([]) },
    salePayment: { aggregate: jest.fn().mockResolvedValue(emptyAggPay) },
    return: { aggregate: jest.fn().mockResolvedValue(emptyAggRet) },
    investor: { findMany: jest.fn().mockResolvedValue([]) },
    ...over,
  } as unknown as Db;
}

describe('collectTargets', () => {
  it('item: one item, pulls in its whole sale, reports customer + investor', async () => {
    const t = await collectTargets(
      db({
        item: { findUnique: jest.fn().mockResolvedValue({ id: 5 }) },
        saleItem: { findMany: jest.fn().mockResolvedValue([{ saleId: 1 }]) },
        itemIdentifier: { count: jest.fn().mockResolvedValue(2) },
        sale: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              total: new Prisma.Decimal('100'),
              customer: { name: 'Ali' },
              partner: null,
              payments: [{ amount: new Prisma.Decimal('40') }],
              _count: { items: 1 },
            },
          ]),
        },
        salePayment: { aggregate: jest.fn().mockResolvedValue({ _count: 1, _sum: { amount: new Prisma.Decimal('40') } }) },
        investor: { findMany: jest.fn().mockResolvedValue([{ name: 'Own' }]) },
      }),
      { type: 'item', id: 5 },
    );

    expect(t.itemIds).toEqual([5]);
    expect(t.productModelIds).toEqual([]);
    expect(t.categoryId).toBeNull();
    expect(t.saleIds).toEqual([1]);
    expect(t.report.counts.items).toBe(1);
    expect(t.report.counts.itemIdentifiers).toBe(2);
    expect(t.report.sales[0]).toMatchObject({ saleId: 1, customerName: 'Ali', total: '100', paid: '40', itemCount: 1 });
    expect(t.report.salePaymentSum).toBe('40');
    expect(t.report.customers).toEqual(['Ali']);
    expect(t.report.investors).toEqual(['Own']);
  });

  it('productModel: cascades to its items and accessory stock, no sales', async () => {
    const t = await collectTargets(
      db({
        productModel: { findUnique: jest.fn().mockResolvedValue({ id: 10 }) },
        item: { findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) },
        accessoryStock: { count: jest.fn().mockResolvedValue(3) },
        itemIdentifier: { count: jest.fn().mockResolvedValue(4) },
      }),
      { type: 'productModel', id: 10 },
    );

    expect(t.productModelIds).toEqual([10]);
    expect(t.itemIds).toEqual([1, 2]);
    expect(t.categoryId).toBeNull();
    expect(t.saleIds).toEqual([]);
    expect(t.report.counts).toEqual({ productModels: 1, items: 2, accessoryStock: 3, itemIdentifiers: 4 });
    expect(t.report.sales).toEqual([]);
  });

  it('category: a shared multi-item sale is pulled in WHOLE (itemCount 2, one line a target)', async () => {
    const t = await collectTargets(
      db({
        category: { findUnique: jest.fn().mockResolvedValue({ id: 7 }) },
        productModel: { findMany: jest.fn().mockResolvedValue([{ id: 10 }]) },
        item: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
        saleItem: { findMany: jest.fn().mockResolvedValue([{ saleId: 77 }]) },
        itemIdentifier: { count: jest.fn().mockResolvedValue(1) },
        sale: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 77,
              total: new Prisma.Decimal('200'),
              customer: null,
              partner: { name: 'Shop X' },
              payments: [{ amount: new Prisma.Decimal('50') }, { amount: new Prisma.Decimal('30') }],
              _count: { items: 2 },
            },
          ]),
        },
        salePayment: { aggregate: jest.fn().mockResolvedValue({ _count: 2, _sum: { amount: new Prisma.Decimal('80') } }) },
        investor: { findMany: jest.fn().mockResolvedValue([{ name: 'Sardor' }]) },
      }),
      { type: 'category', id: 7 },
    );

    expect(t.categoryId).toBe(7);
    expect(t.saleIds).toEqual([77]);
    // Whole-sale rule: the receipt had 2 lines, only one a target item, but all of it goes.
    expect(t.report.sales[0]).toMatchObject({ saleId: 77, customerName: 'Shop X', paid: '80', itemCount: 2 });
    expect(t.report.customers).toEqual(['Shop X']);
  });

  it('collects surviving items: a device sharing the receipt but not in the delete set', async () => {
    // collectSaleIds queries by saleId; collectSurvivingItemIds queries by itemId — tell them apart.
    const saleItemFindMany = jest.fn().mockImplementation((args: { distinct?: string[] }) =>
      args.distinct?.[0] === 'saleId' ? [{ saleId: 77 }] : [{ itemId: 1 }, { itemId: 2 }],
    );
    const t = await collectTargets(
      db({
        category: { findUnique: jest.fn().mockResolvedValue({ id: 7 }) },
        productModel: { findMany: jest.fn().mockResolvedValue([{ id: 10 }]) },
        item: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) }, // only item 1 is a target
        saleItem: { findMany: saleItemFindMany },
      }),
      { type: 'category', id: 7 },
    );

    // Item 2 shared sale 77 but is not being deleted → it survives and must be restocked.
    expect(t.itemIds).toEqual([1]);
    expect(t.survivingItemIds).toEqual([2]);
  });

  it('throws 404 when the target does not exist', async () => {
    await expect(
      collectTargets(db({ item: { findUnique: jest.fn().mockResolvedValue(null) } }), { type: 'item', id: 999 }),
    ).rejects.toThrow('Item not found');
  });
});
