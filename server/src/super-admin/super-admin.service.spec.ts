import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { BackupsService } from '../backups/backups.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { SuperAdminService } from './super-admin.service';

const superAdmin = { id: 9, role: { name: 'SuperAdmin' } } as PublicUser;
const admin = { id: 2, role: { name: 'Admin' } } as PublicUser;

/** tx for an `item` delete with no sales: enough methods for collect + snapshot + delete. */
function buildTx() {
  return {
    item: {
      findUnique: jest.fn().mockResolvedValue({ id: 5 }),
      findMany: jest.fn().mockResolvedValue([{ id: 5, salePrice: null }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    saleItem: { findMany: jest.fn().mockResolvedValue([]) },
    itemIdentifier: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([{ id: 1, itemId: 5, value: '111' }]),
    },
    investor: { findMany: jest.fn().mockResolvedValue([{ name: 'Own' }]) },
    consignmentItem: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    transferItem: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    purchaseLine: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    stockCountScan: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
}

/**
 * tx for a `category` delete whose single target item (id 1) shares sale 77 with a surviving
 * other-category device (id 2). Enough methods for collect + snapshot + delete + restock.
 */
function buildCategoryTx() {
  const del = () => jest.fn().mockResolvedValue({ count: 0 });
  const empty = () => jest.fn().mockResolvedValue([]);
  return {
    category: { findUnique: jest.fn().mockResolvedValue({ id: 7 }), delete: jest.fn().mockResolvedValue({ id: 7 }) },
    productModel: { findMany: jest.fn().mockResolvedValue([{ id: 10 }]), deleteMany: del() },
    item: {
      findMany: jest.fn().mockResolvedValue([{ id: 1 }]), // only item 1 is a target
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    // saleId query → sale 77; itemId query → both devices (1 target, 2 surviving).
    saleItem: {
      findMany: jest
        .fn()
        .mockImplementation((args: { distinct?: string[] }) =>
          args.distinct?.[0] === 'saleId' ? [{ saleId: 77 }] : [{ itemId: 1 }, { itemId: 2 }],
        ),
      deleteMany: del(),
    },
    accessoryStock: { count: jest.fn().mockResolvedValue(0), findMany: empty(), deleteMany: del() },
    itemIdentifier: { count: jest.fn().mockResolvedValue(0), findMany: empty() },
    investor: { findMany: jest.fn().mockResolvedValue([]) },
    sale: {
      findMany: jest.fn().mockResolvedValue([
        { id: 77, total: null, customer: null, partner: null, payments: [], _count: { items: 2 } },
      ]),
      deleteMany: del(),
    },
    salePayment: { aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: { amount: null } }), findMany: empty(), deleteMany: del() },
    return: { aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: { refundAmount: null } }), findMany: empty(), deleteMany: del() },
    consignmentItem: { findMany: empty(), deleteMany: del() },
    transferItem: { findMany: empty(), deleteMany: del() },
    transferAccessory: { findMany: empty(), deleteMany: del() },
    purchaseLine: { findMany: empty(), deleteMany: del() },
    stockCountScan: { findMany: empty(), deleteMany: del() },
    categoryAttribute: { findMany: empty(), deleteMany: del() },
  };
}

type Tx = ReturnType<typeof buildTx> | ReturnType<typeof buildCategoryTx>;

function build(tx: Tx = buildTx(), over: { auth?: AuthService; backups?: BackupsService } = {}) {
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const backups =
    over.backups ?? ({ run: jest.fn().mockResolvedValue({ fileName: 'backup-x.enc' }) } as unknown as BackupsService);
  const auth = over.auth ?? ({ verifyPassword: jest.fn().mockResolvedValue(undefined) } as unknown as AuthService);
  const service = new SuperAdminService(prisma, audit, backups, auth);
  return { service, audit, backups, auth, tx };
}

const dto = { type: 'item', id: 5, password: 'pw' } as const;

describe('SuperAdminService', () => {
  it('403 for a non-super-admin on preview and execute', async () => {
    const { service } = build();
    await expect(service.preview(admin, { type: 'item', id: 5 })).rejects.toThrow(ForbiddenException);
    await expect(service.execute(admin, dto)).rejects.toThrow(ForbiddenException);
  });

  it('wrong password → 401, nothing deleted and no backup taken', async () => {
    const auth = { verifyPassword: jest.fn().mockRejectedValue(new UnauthorizedException()) } as unknown as AuthService;
    const { service, backups, tx } = build(buildTx(), { auth });
    await expect(service.execute(superAdmin, dto)).rejects.toThrow(UnauthorizedException);
    expect(backups.run).not.toHaveBeenCalled();
    expect(tx.item.deleteMany).not.toHaveBeenCalled();
  });

  it('backup failure aborts the delete (no recovery point, no delete)', async () => {
    const backups = { run: jest.fn().mockRejectedValue(new Error('pg_dump failed')) } as unknown as BackupsService;
    const { service, tx } = build(buildTx(), { backups });
    await expect(service.execute(superAdmin, dto)).rejects.toThrow('pg_dump failed');
    expect(tx.item.deleteMany).not.toHaveBeenCalled();
  });

  it('happy path: backup first, full-row snapshot audited, then delete', async () => {
    const { service, audit, backups, tx } = build();
    const result = await service.execute(superAdmin, dto);

    expect(backups.run).toHaveBeenCalledTimes(1);
    const entry = (audit.log as jest.Mock).mock.calls[0][0];
    expect(entry).toMatchObject({ action: 'HARD_DELETE', entity: 'Item', entityId: 5, userId: 9 });
    expect(entry.before.items).toEqual([{ id: 5, salePrice: null }]); // full rows, not counts
    expect(entry.before.itemIdentifiers).toHaveLength(1);
    expect(entry.after.backupRef).toBe('backup-x.enc');
    // Snapshot written before the delete; item removed by the frozen id set.
    expect(tx.item.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [5] } } });
    expect(result.deleted.counts.items).toBe(1);
  });

  it('category delete restocks a surviving other-category device and records it in the audit', async () => {
    const tx = buildCategoryTx();
    const { service, audit } = build(tx);

    await service.execute(superAdmin, { type: 'category', id: 7, password: 'pw' });

    // Surviving device (id 2) goes back to sellable stock; the deleted item (id 1) is untouched.
    expect(tx.item.updateMany).toHaveBeenCalledWith({ where: { id: { in: [2] } }, data: { status: 'IN_STOCK' } });
    const entry = (audit.log as jest.Mock).mock.calls[0][0];
    expect(entry.action).toBe('HARD_DELETE');
    expect(entry.before.restockedItemIds).toEqual([2]);
  });
});
