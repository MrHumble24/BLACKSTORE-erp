import { Prisma } from '@prisma/client';
import type { BusinessDayService } from '../business-day/business-day.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { InvestorReportService } from '../reports/investor-report.service';
import type { SettingsService } from '../settings/settings.service';
import { BotReportsService } from './bot-reports.service';

const D = (v: string | number) => new Prisma.Decimal(v);
/** A DEBT sale row: total, payments and refunds → balance (BR-8). */
const debtSale = (total: number, paid = 0, refunded = 0) => ({
  total: D(total),
  payments: paid ? [{ amount: D(paid) }] : [],
  returns: refunded ? [{ refundAmount: D(refunded) }] : [],
});

describe('BotReportsService', () => {
  const sale = { findMany: jest.fn() };
  const saleItem = { findMany: jest.fn() };
  const accessoryStock = { findMany: jest.fn() };
  const report = jest.fn();
  const businessDay = { getCurrent: jest.fn() };
  const service = new BotReportsService(
    { sale, saleItem, accessoryStock } as unknown as PrismaService,
    { getReceipt: jest.fn().mockResolvedValue({ shopName: 'Shop' }) } as unknown as SettingsService,
    { report } as unknown as InvestorReportService,
    businessDay as unknown as BusinessDayService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lowStock: empty state when nothing is low', async () => {
    accessoryStock.findMany.mockResolvedValue([]);
    expect(await service.lowStock()).toBe("✅ Kam qolgan tovar yo'q");
  });

  it('debtors: lists all debtors, sorts desc, total over all', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({
      customer: { id: i + 1, name: `C${i + 1}` },
      ...debtSale(100 + i),
    }));
    rows.push({ customer: { id: 1, name: 'C1' }, ...debtSale(500, 100, 50) }); // C1: 100 + 350
    rows.push({ customer: { id: 99, name: 'Paid' }, ...debtSale(10, 10) }); // balance 0 → not a debtor
    sale.findMany.mockResolvedValue(rows);
    const text = await service.debtors();
    const lines = text.split('\n').filter((l) => l.startsWith('•'));
    expect(lines).toHaveLength(11); // every debtor listed, not just the top 10
    expect(lines[0]).toBe('• C1 — $450.00');
    expect(text).toContain('C2 —'); // smallest debtor now included
    expect(text).toContain('Jami: $1 505.00 (11 mijoz)');
    expect(sale.findMany.mock.calls[0][0].where).toEqual({ status: 'DEBT', customerId: { not: null } });
  });

  it('debtors: none', async () => {
    sale.findMany.mockResolvedValue([]);
    expect(await service.debtors()).toBe("✅ Qarzdor yo'q");
  });

  it('customerDebt: one total over several sales of THIS customer; zero → no-debt text', async () => {
    sale.findMany.mockResolvedValue([debtSale(300, 100), debtSale(200, 0, 50)]);
    expect(await service.customerDebt(42)).toContain('$350.00');
    expect(sale.findMany.mock.calls[0][0].where).toEqual({ customerId: 42, status: 'DEBT' });
    sale.findMany.mockResolvedValue([]);
    expect(await service.customerDebt(42)).toContain("Sizda qarz yo'q");
  });

  it('customerWarranty: own, unreturned, still valid, newest first, capped at 20', async () => {
    saleItem.findMany.mockResolvedValue([
      { warrantyUntil: new Date(2027, 0, 5), productModel: null, item: { identifiers: [{ value: 'IMEI1' }] } },
    ]);
    expect(await service.customerWarranty(42)).toContain('• IMEI1 — 05.01.2027 gacha');
    const args = saleItem.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ sale: { customerId: 42 }, returns: { none: {} } });
    expect(args.where.warrantyUntil.gte).toBeInstanceOf(Date);
    expect(args.orderBy).toEqual({ sale: { createdAt: 'desc' } });
    expect(args.take).toBe(20);
  });

  it('investorMonth: own row without cost, else no-activity', async () => {
    report.mockResolvedValue({ rows: [{ investor: { id: 7 }, sales: '10', profit: '4', investorShare: '2' }] });
    const text = await service.investorMonth(7, 'Ali', '2026-09');
    expect(report).toHaveBeenCalledWith({ month: '2026-09', investorId: 7 }, false);
    expect(text).toContain('Sizning ulushingiz: $2.00');
    report.mockResolvedValue({ rows: [] });
    expect(await service.investorMonth(7, 'Ali', '2026-09')).toContain("Bu oyda harakat yo'q");
  });

  it('cashStatus: returns formatted live cash status when day is open', async () => {
    businessDay.getCurrent.mockResolvedValue({
      day: { id: 3 },
      expectedCash: '2000.00',
      expectedCard: '500.00',
      breakdown: {
        paymentsCash: '2500.00',
        paymentsCard: '500.00',
        cashIncome: '100.00',
        cashExpense: '200.00',
        cashRefunds: '50.00',
        walkInPurchases: '350.00',
        pendingSalesCash: '150.00',
      },
      pendingSalesCount: 1,
    });

    const text = await service.cashStatus();
    expect(text).toContain('💵 Kassa holati</b> (#3)');
    expect(text).toContain('Kassada naqd pul:</b> $2 000.00');
    expect(text).toContain('Karta / Terminal:</b> $500.00');
    expect(text).toContain('1 ta tasdiqlanmagan savdo');
  });

  it('cashStatus: handles no open business day gracefully', async () => {
    businessDay.getCurrent.mockRejectedValue(new Error('No open day'));
    const text = await service.cashStatus();
    expect(text).toBe('⚠️ Hozirda ochiq kassa (ish kuni) mavjud emas.');
  });
});
