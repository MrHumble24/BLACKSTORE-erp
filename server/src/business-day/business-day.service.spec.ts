import { ConflictException } from '@nestjs/common';
import { DayStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessDayService } from './business-day.service';

const actor = { id: 9 } as PublicUser;

// A tx whose window queries return nothing, so expected* is zero and the maths is driven by counted*.
function buildTx(overrides: Record<string, unknown> = {}) {
  return {
    businessDay: {
      findFirst: jest.fn().mockResolvedValue({ id: 1, openedAt: new Date('2026-10-24T00:00:00Z') }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: 2, openedAt: new Date(), status: DayStatus.OPEN }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 1,
        openedAt: new Date('2026-10-24T00:00:00Z'),
        closedAt: new Date('2026-10-24T20:00:00Z'),
        status: DayStatus.CLOSED,
        note: null,
        expectedCash: null,
        countedCash: null,
        cashVariance: null,
        expectedCard: null,
        countedCard: null,
        cardVariance: null,
        closedBy: { id: 9, name: 'Owner' },
      }),
    },
    dayCloseFlag: { create: jest.fn().mockResolvedValue({ id: 50 }) },
    salePayment: { findMany: jest.fn().mockResolvedValue([]) },
    ledgerEntry: { findMany: jest.fn().mockResolvedValue([]) },
    sale: { findMany: jest.fn().mockResolvedValue([]) },
    return: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function build(tx: ReturnType<typeof buildTx>) {
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  return { service: new BusinessDayService(prisma, audit), audit };
}

describe('BusinessDayService.close (single-open-day invariant)', () => {
  it('freezes the variance snapshot, auto-opens the next day and audits the close + auto-open', async () => {
    const tx = buildTx();
    const { service, audit } = build(tx);
    await service.close({ countedCash: '1000.50', countedCard: '0' }, actor);

    // Expected is 0 (empty window), so cashVariance = countedCash − 0 = 1000.50.
    const snapshot = tx.businessDay.updateMany.mock.calls[0][0].data;
    expect(snapshot.status).toBe(DayStatus.CLOSED);
    expect(snapshot.cashVariance.toFixed(2)).toBe('1000.50');
    expect(snapshot.expectedCash.toFixed(2)).toBe('0.00');
    // Guarded to the open day only (atomic no-double-close).
    expect(tx.businessDay.updateMany.mock.calls[0][0].where).toEqual({ id: 1, status: DayStatus.OPEN });
    expect(tx.businessDay.create).toHaveBeenCalledTimes(1); // next day opened
    expect(audit.log).toHaveBeenCalledTimes(2); // close + auto-open, no flags
  });

  it('fails cleanly when a concurrent close already closed the day (updateMany matches 0 rows)', async () => {
    const tx = buildTx({
      businessDay: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, openedAt: new Date() }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }), // the other close won the race
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    });
    const { service } = build(tx);
    await expect(service.close({ countedCash: '100', countedCard: '0' }, actor)).rejects.toThrow(ConflictException);
    expect(tx.businessDay.create).not.toHaveBeenCalled(); // no second next-day opened
  });

  it('rejects closing when there is no open day', async () => {
    const tx = buildTx({
      businessDay: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn(), create: jest.fn(), findUniqueOrThrow: jest.fn() },
    });
    const { service } = build(tx);
    await expect(service.close({ countedCash: '100', countedCard: '0' }, actor)).rejects.toThrow(ConflictException);
  });

  it('persists and audits each owner flag against the closed day', async () => {
    const tx = buildTx();
    const { service, audit } = build(tx);
    await service.close(
      { countedCash: '0', countedCard: '0', flags: [{ refType: 'RETURN', refId: 7, reason: 'fake return?' }] },
      actor,
    );
    expect(tx.dayCloseFlag.create).toHaveBeenCalledWith({
      data: { businessDayId: 1, refType: 'RETURN', refId: 7, reason: 'fake return?' },
    });
    expect(audit.log).toHaveBeenCalledTimes(3); // close + auto-open + one flag
  });
});
