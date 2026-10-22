import { BadRequestException } from '@nestjs/common';
import { LedgerType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

const actor = { id: 7 } as PublicUser;

describe('LedgerService', () => {
  const ledgerEntry = { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(), create: jest.fn() };
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

  it('computes income, expense and net totals over the filter', async () => {
    ledgerEntry.findMany.mockResolvedValue([]);
    ledgerEntry.count.mockResolvedValue(0);
    ledgerEntry.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: new Prisma.Decimal('300') } },
      { type: 'EXPENSE', _sum: { amount: new Prisma.Decimal('120') } },
    ]);
    const page = await service.findAll({ page: 1, pageSize: 20 });
    expect(page.totals).toEqual({ income: '300.00', expense: '120.00', net: '180.00' });
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
