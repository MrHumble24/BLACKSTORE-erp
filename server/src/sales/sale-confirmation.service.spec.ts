import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { SaleConfirmationService } from './sale-confirmation.service';

const actor = { id: 5, name: 'Admin' } as unknown as PublicUser;
const openedAt = new Date('2026-10-25T06:00:00Z');

// A sale as saleSummarySelect loads it, with the given confirmation state.
const summary = (confirmedAt: Date | null, confirmedById: number | null) => ({
  id: 7, createdAt: new Date('2026-10-25T09:00:00Z'), status: 'PAID', dueDate: null, total: new Prisma.Decimal('1100'),
  customer: null, location: { id: 1, name: 'Shop' }, seller: { id: 3, name: 'Staff' },
  confirmedAt, confirmedBy: confirmedById ? { id: confirmedById, name: 'Admin' } : null,
  items: [{ quantity: 1 }], payments: [{ amount: new Prisma.Decimal('1100') }], returns: [],
});

function build(rows: { id: number; confirmedAt: Date | null; confirmedById: number | null }[]) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
    businessDay: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, openedAt }) },
    sale: {
      findUnique: jest.fn().mockResolvedValue(rows[0] ?? null),
      findMany: jest.fn().mockResolvedValue(rows),
      update: jest.fn().mockImplementation(({ data }: { data: { confirmedAt: Date | null; confirmedById: number | null } }) =>
        Promise.resolve(summary(data.confirmedAt, data.confirmedById)),
      ),
      updateMany: jest.fn().mockImplementation(({ where }: { where: { id: { in: number[] } } }) =>
        Promise.resolve({ count: where.id.in.length }),
      ),
    },
  };
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const audit = { log: jest.fn(), logMany: jest.fn() };
  return { service: new SaleConfirmationService(prisma, audit as unknown as AuditService), tx, audit };
}

describe('SaleConfirmationService (F33)', () => {
  it('confirm sets confirmedAt/By, audits before/after and locks the open day first', async () => {
    const { service, tx, audit } = build([{ id: 7, confirmedAt: null, confirmedById: null }]);
    const row = await service.confirm(7, actor);

    expect(tx.sale.update.mock.calls[0][0].data).toEqual({ confirmedAt: expect.any(Date), confirmedById: 5 });
    expect(row).toMatchObject({ id: 7, confirmedBy: { id: 5, name: 'Admin' }, canUndo: true, status: 'PAID', balance: '0.00' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update', entity: 'Sale', entityId: 7,
        before: { confirmedAt: null, confirmedById: null }, after: { confirmedAt: expect.any(Date), confirmedById: 5 },
      }),
      tx,
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.sale.findUnique.mock.invocationCallOrder[0]);
  });

  it('confirm twice is a 409', async () => {
    const { service, tx } = build([{ id: 7, confirmedAt: new Date(), confirmedById: 5 }]);
    await expect(service.confirm(7, actor)).rejects.toThrow(ConflictException);
    expect(tx.sale.update).not.toHaveBeenCalled();
  });

  it('confirm of an unknown sale is a 404', async () => {
    const { service } = build([]);
    await expect(service.confirm(7, actor)).rejects.toThrow(NotFoundException);
  });

  it('no open day is a 409 before anything is read', async () => {
    const { service, tx } = build([{ id: 7, confirmedAt: null, confirmedById: null }]);
    tx.$queryRaw.mockResolvedValue([]);
    await expect(service.confirm(7, actor)).rejects.toThrow(ConflictException);
    expect(tx.sale.findUnique).not.toHaveBeenCalled();
  });

  it('confirmMany skips already confirmed sales, dedupes ids and audits each confirmed sale in one batch', async () => {
    const { service, tx, audit } = build([
      { id: 1, confirmedAt: null, confirmedById: null },
      { id: 2, confirmedAt: new Date('2026-10-25T07:00:00Z'), confirmedById: 5 },
      { id: 3, confirmedAt: null, confirmedById: null },
    ]);
    await expect(service.confirmMany([1, 2, 3, 3], actor)).resolves.toEqual({ confirmed: 2 });

    expect(tx.sale.findMany.mock.calls[0][0].where).toEqual({ id: { in: [1, 2, 3] } });
    expect(tx.sale.updateMany.mock.calls[0][0].where).toEqual({ id: { in: [1, 3] }, confirmedAt: null });
    expect(audit.log).not.toHaveBeenCalled();
    expect(audit.logMany).toHaveBeenCalledTimes(1);
    const [entries, client] = audit.logMany.mock.calls[0] as [{ entityId: number }[], unknown];
    expect(entries.map((e) => e.entityId)).toEqual([1, 3]);
    expect(client).toBe(tx);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.sale.findMany.mock.invocationCallOrder[0]);
  });

  it('confirmMany with an unknown id is a 404 for the whole batch', async () => {
    const { service, tx } = build([{ id: 1, confirmedAt: null, confirmedById: null }]);
    await expect(service.confirmMany([1, 99], actor)).rejects.toThrow(NotFoundException);
    expect(tx.sale.updateMany).not.toHaveBeenCalled();
  });

  it('unconfirm inside the open day clears the confirmation', async () => {
    const { service, tx } = build([{ id: 7, confirmedAt: new Date('2026-10-25T09:00:00Z'), confirmedById: 5 }]);
    const row = await service.unconfirm(7, actor);
    expect(tx.sale.update.mock.calls[0][0].data).toEqual({ confirmedAt: null, confirmedById: null });
    expect(row).toMatchObject({ confirmedAt: null, confirmedBy: null, canUndo: false });
  });

  it('unconfirm of a sale confirmed before openedAt (frozen by a close) is a 409', async () => {
    const { service, tx } = build([{ id: 7, confirmedAt: new Date('2026-10-24T12:00:00Z'), confirmedById: 5 }]);
    await expect(service.unconfirm(7, actor)).rejects.toThrow(ConflictException);
    expect(tx.sale.update).not.toHaveBeenCalled();
  });

  it('unconfirm of an unconfirmed sale is a 409', async () => {
    const { service } = build([{ id: 7, confirmedAt: null, confirmedById: null }]);
    await expect(service.unconfirm(7, actor)).rejects.toThrow(ConflictException);
  });
});
