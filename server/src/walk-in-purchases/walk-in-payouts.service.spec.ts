import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { WalkInPayoutsService } from './walk-in-payouts.service';

const actor = { id: 5, name: 'Admin' } as unknown as PublicUser;
const openedAt = new Date('2026-10-25T06:00:00Z');

// A walk-in line as payoutSelect loads it.
const line = (over: object = {}) => ({
  id: 41,
  createdAt: new Date('2026-10-24T10:00:00Z'),
  unitPrice: new Prisma.Decimal('150'),
  quantity: 1,
  walkInSellerId: 3,
  paidAt: null as Date | null,
  paidBy: null as { id: number; name: string } | null,
  walkInSeller: { name: 'Bob', phone: '+998901112233' },
  item: { id: 7, productModel: { name: 'iPhone 15' }, identifiers: [{ value: '3500' }] },
  ...over,
});

function build(current: ReturnType<typeof line> | null, openRows: { id: number }[] = [{ id: 1 }]) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(openRows),
    businessDay: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, openedAt }) },
    purchaseLine: {
      findUnique: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockImplementation(({ data }: { data: { paidAt: Date | null; paidById: number | null } }) =>
        Promise.resolve(line({ paidAt: data.paidAt, paidBy: data.paidById ? { id: data.paidById, name: 'Admin' } : null })),
      ),
    },
  };
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const audit = { log: jest.fn() };
  return { service: new WalkInPayoutsService(prisma, audit as unknown as AuditService), tx, audit };
}

describe('WalkInPayoutsService (F32)', () => {
  it('pay sets paidAt/paidBy, audits before/after and locks the open day first', async () => {
    const { service, tx, audit } = build(line());
    const row = await service.pay(41, actor);

    expect(tx.purchaseLine.update.mock.calls[0][0].data).toEqual({ paidAt: expect.any(Date), paidById: 5 });
    expect(row).toMatchObject({ lineId: 41, amount: '150.00', paidBy: { id: 5, name: 'Admin' }, seller: { name: 'Bob' } });
    expect(row.paidAt).not.toBeNull();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update', entity: 'PurchaseLine', entityId: 41,
        before: { paidAt: null, paidById: null }, after: { paidAt: expect.any(Date), paidById: 5 }, // no seller phone
      }),
      tx,
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.purchaseLine.findUnique.mock.invocationCallOrder[0]);
  });

  it('pay twice is a 409', async () => {
    const { service, tx } = build(line({ paidAt: new Date() }));
    await expect(service.pay(41, actor)).rejects.toThrow(ConflictException);
    expect(tx.purchaseLine.update).not.toHaveBeenCalled();
  });

  it('unpay inside the open day clears the payout', async () => {
    const { service, tx } = build(line({ paidAt: new Date('2026-10-25T09:00:00Z'), paidBy: { id: 5, name: 'Admin' } }));
    const row = await service.unpay(41, actor);
    expect(tx.purchaseLine.update.mock.calls[0][0].data).toEqual({ paidAt: null, paidById: null });
    expect(row).toMatchObject({ paidAt: null, paidBy: null });
  });

  it('unpay of a payout before the open day (frozen by a close) is a 409', async () => {
    const { service, tx } = build(line({ paidAt: new Date('2026-10-24T12:00:00Z') }));
    await expect(service.unpay(41, actor)).rejects.toThrow(ConflictException);
    expect(tx.purchaseLine.update).not.toHaveBeenCalled();
  });

  it('unpay of an unconfirmed line is a 409', async () => {
    const { service } = build(line());
    await expect(service.unpay(41, actor)).rejects.toThrow(ConflictException);
  });

  it('a missing or non-walk-in line is a 404', async () => {
    await expect(build(line({ walkInSellerId: null })).service.pay(41, actor)).rejects.toThrow(NotFoundException);
    await expect(build(null).service.pay(41, actor)).rejects.toThrow(NotFoundException);
  });

  it('pay retries the lock once when the day it waited on was just closed', async () => {
    const { service, tx } = build(line());
    tx.$queryRaw.mockResolvedValueOnce([]); // the close won; a fresh statement finds the new OPEN day
    await service.pay(41, actor);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.purchaseLine.update).toHaveBeenCalledTimes(1);
  });

  it('no OPEN day is a 409 and the line is never touched', async () => {
    const { service, tx } = build(line(), []);
    await expect(service.pay(41, actor)).rejects.toThrow(ConflictException);
    expect(tx.purchaseLine.findUnique).not.toHaveBeenCalled();
  });
});
