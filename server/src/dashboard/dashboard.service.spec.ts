import { Prisma, SaleStatus } from '@prisma/client';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { ProfitReportService } from '../reports/profit-report.service';
import { DashboardService } from './dashboard.service';

const d = (v: string) => new Prisma.Decimal(v);
const actor = (permissions: string[]) => ({ id: 1, role: { permissions } }) as unknown as PublicUser;

// Two DEBT sales for customer 1 (600 + 500 owed) and one fully-paid DEBT edge case (customer 2, 0).
const debtSales = [
  { customerId: 1, total: d('1000'), payments: [{ amount: d('400') }], returns: [] },
  { customerId: 1, total: d('500'), payments: [], returns: [] },
  { customerId: 2, total: d('300'), payments: [{ amount: d('300') }], returns: [] },
];

const recentRows = [
  { id: 9, createdAt: new Date('2026-10-24T10:00:00Z'), status: SaleStatus.PAID, total: d('1200'), customer: { name: 'Ali' } },
  { id: 8, createdAt: new Date('2026-10-24T09:00:00Z'), status: SaleStatus.DEBT, total: d('300'), customer: null },
];

function makeService() {
  const prisma = {
    sale: {
      aggregate: jest.fn().mockResolvedValue({ _count: 3, _sum: { total: d('1500') } }),
      // customerDebt vs recentSales both call findMany; recent asks for take: 5.
      findMany: jest.fn((args: { take?: number }) =>
        Promise.resolve(args.take === 5 ? recentRows : debtSales),
      ),
    },
    item: {
      aggregate: jest.fn((args: { where: { status: string } }) => {
        if (args.where.status === 'IN_STOCK') {
          return Promise.resolve({
            _count: 42,
            _sum: { salePrice: d('42000'), purchasePrice: d('30000'), extraCost: d('1000') },
          });
        }
        return Promise.resolve({
          _count: 5,
          _sum: { salePrice: d('5000'), purchasePrice: d('3500'), extraCost: d('100') },
        });
      }),
    },
    accessoryStock: {
      aggregate: jest.fn().mockResolvedValue({
        _sum: { quantity: 15 },
      }),
      findMany: jest.fn().mockResolvedValue([
        { id: 1, quantity: 2, avgCost: d('10'), productModel: { lowStockThreshold: 5 } },
        { id: 2, quantity: 1, avgCost: d('20'), productModel: { lowStockThreshold: 3 } },
      ]),
    },
    consignmentItem: {
      aggregate: jest.fn().mockResolvedValue({
        _count: 5,
        _sum: { minPrice: d('6000') },
      }),
      count: jest.fn().mockResolvedValue(2),
    },
  } as unknown as PrismaService;
  const profit = {
    profitFor: jest.fn().mockResolvedValue({ gross: d('200'), net: d('900') }),
  } as unknown as ProfitReportService;
  return { service: new DashboardService(prisma, profit), profit };
}

describe('DashboardService.summary (F10)', () => {
  it('aggregates today, stock, debt (BR-8) and overdue counts', async () => {
    const { service } = makeService();
    const res = await service.summary(actor(['view_stock']));
    expect(res.today.salesCount).toBe(3);
    expect(res.today.salesTotal).toBe('1500.00');
    expect(res.stock.inStockDevices).toBe(42);
    expect(res.stock.atPartnerDevices).toBe(5);
    expect(res.stock.inStockSaleValue).toBe('42000.00');
    expect(res.stock.atPartnerSaleValue).toBe('6000.00');
    expect(res.stock.totalSaleValue).toBe('48000.00');
    expect(res.stock.accessoriesCount).toBe(15);
    expect(res.stock).not.toHaveProperty('inStockCostValue');
    expect(res.stock).not.toHaveProperty('totalCostValue');
    expect(res.lowStockCount).toBe(2); // two accessory rows at/under threshold (#7)
    // Only customer 1 still owes (600 + 500); customer 2's balance is 0 → excluded.
    expect(res.debts).toEqual({ customerDebtTotal: '1100.00', debtorCount: 1 });
    expect(res.partners.overdueCount).toBe(2);
    expect(res.recentSales).toEqual([
      { id: 9, date: '2026-10-24T10:00:00.000Z', customer: 'Ali', total: '1200.00', status: SaleStatus.PAID },
      { id: 8, date: '2026-10-24T09:00:00.000Z', customer: null, total: '300.00', status: SaleStatus.DEBT },
    ]);
  });

  it('exposes profit and cost valuation fields with view_profit', async () => {
    const { service, profit } = makeService();
    const admin = await service.summary(actor(['view_stock', 'view_profit']));
    expect(admin.today).toHaveProperty('profit', '200.00'); // today's gross
    expect(admin).toHaveProperty('monthNetProfit', '900.00'); // month net (BR-5)
    expect(admin.stock).toHaveProperty('inStockCostValue', '31000.00');
    expect(admin.stock).toHaveProperty('atPartnerCostValue', '3600.00');
    expect(admin.stock).toHaveProperty('accessoriesCostValue', '40.00');
    expect(admin.stock).toHaveProperty('totalCostValue', '34640.00');
    expect(profit.profitFor).toHaveBeenCalledTimes(2);
  });

  it('masks profit and cost fields for a staff user (no view_profit or view_cost)', async () => {
    const { service, profit } = makeService();
    const staff = await service.summary(actor(['view_stock']));
    expect(staff.today).not.toHaveProperty('profit');
    expect(staff).not.toHaveProperty('monthNetProfit');
    expect(staff.stock).not.toHaveProperty('inStockCostValue');
    expect(staff.stock).not.toHaveProperty('totalCostValue');
    expect(profit.profitFor).not.toHaveBeenCalled();
  });
});
