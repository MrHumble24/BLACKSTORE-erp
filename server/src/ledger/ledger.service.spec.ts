import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseStatus, LedgerType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

const actor = { id: 7 } as PublicUser;

describe('LedgerService', () => {
  const ledgerEntry = {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    ledgerEntry, // findAll reads via this.prisma.* in the array form
    // findAll uses the array form, create uses the callback form.
    $transaction: (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: unknown) => unknown)({ ledgerEntry })
        : Promise.all(arg as Promise<unknown>[]),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new LedgerService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  it('totals: net subtracts CONFIRMED expenses only; PENDING and EXCLUDED have their own totals', async () => {
    ledgerEntry.findMany.mockResolvedValue([]);
    ledgerEntry.count.mockResolvedValue(0);
    ledgerEntry.groupBy.mockResolvedValue([
      { type: 'INCOME', status: 'CONFIRMED', _sum: { amount: new Prisma.Decimal('300') } },
      { type: 'EXPENSE', status: 'CONFIRMED', _sum: { amount: new Prisma.Decimal('120') } },
      { type: 'EXPENSE', status: 'PENDING', _sum: { amount: new Prisma.Decimal('40') } },
      { type: 'EXPENSE', status: 'EXCLUDED', _sum: { amount: new Prisma.Decimal('15') } },
    ]);
    const page = await service.findAll({ page: 1, pageSize: 20 });
    expect(page.totals).toEqual({
      income: '300.00',
      expense: '120.00',
      pendingExpense: '40.00',
      excludedExpense: '15.00',
      net: '180.00',
    });
  });

  it('starts an EXPENSE as PENDING and an INCOME as CONFIRMED', async () => {
    ledgerEntry.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 1,
      user: { id: 7, name: 'Me' },
      ...data,
    }));
    const expense = await service.create({ type: LedgerType.EXPENSE, category: 'Rent', amount: '500' }, actor);
    const income = await service.create({ type: LedgerType.INCOME, category: 'Repair', amount: '50' }, actor);
    expect(expense.status).toBe(ExpenseStatus.PENDING);
    expect(income.status).toBe(ExpenseStatus.CONFIRMED);
  });

  it('setStatus updates an EXPENSE and audits before/after', async () => {
    const row = { id: 3, type: LedgerType.EXPENSE, amount: new Prisma.Decimal('10'), status: ExpenseStatus.PENDING };
    ledgerEntry.findUnique.mockResolvedValue(row);
    ledgerEntry.update.mockResolvedValue({ ...row, status: ExpenseStatus.CONFIRMED });
    const entry = await service.setStatus(3, ExpenseStatus.CONFIRMED, actor);
    expect(entry.status).toBe(ExpenseStatus.CONFIRMED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', entityId: 3, before: row }),
      expect.anything(),
    );
  });

  it('setStatus with the current status returns the entry without an update or audit row', async () => {
    const row = { id: 6, type: LedgerType.EXPENSE, amount: new Prisma.Decimal('10'), status: ExpenseStatus.CONFIRMED };
    ledgerEntry.findUnique.mockResolvedValue(row);
    const entry = await service.setStatus(6, ExpenseStatus.CONFIRMED, actor);
    expect(entry.status).toBe(ExpenseStatus.CONFIRMED);
    expect(ledgerEntry.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('setStatus rejects an INCOME row (400) and an unknown id (404)', async () => {
    ledgerEntry.findUnique.mockResolvedValueOnce({ id: 4, type: LedgerType.INCOME });
    await expect(service.setStatus(4, ExpenseStatus.EXCLUDED, actor)).rejects.toThrow(BadRequestException);
    ledgerEntry.findUnique.mockResolvedValueOnce(null);
    await expect(service.setStatus(5, ExpenseStatus.EXCLUDED, actor)).rejects.toThrow(NotFoundException);
    expect(ledgerEntry.update).not.toHaveBeenCalled();
  });

  it('forces countsInProfit false for an EXPENSE', async () => {
    ledgerEntry.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 1,
      user: { id: 7, name: 'Me' },
      ...data,
    }));
    const entry = await service.create(
      { type: LedgerType.EXPENSE, category: 'Rent', amount: '500', countsInProfit: true },
      actor,
    );
    expect(entry.countsInProfit).toBe(false);
  });

  it('keeps countsInProfit true for an INCOME when asked', async () => {
    ledgerEntry.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 1,
      user: { id: 7, name: 'Me' },
      ...data,
    }));
    const entry = await service.create(
      { type: LedgerType.INCOME, category: 'Repair', amount: '50', countsInProfit: true },
      actor,
    );
    expect(entry.countsInProfit).toBe(true);
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      service.create({ type: LedgerType.INCOME, category: 'X', amount: '0' }, actor),
    ).rejects.toThrow(BadRequestException);
  });
});
