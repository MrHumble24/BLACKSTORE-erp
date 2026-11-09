import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WatchSyncService } from './watch-sync.service';
import { cleanAliases, WatchesService } from './watches.service';

/** WatchesService over a mocked transaction client that echoes the written data back. */
function makeService(existing: object | null = { id: 3, maxPrice: null }, count = 0) {
  const tx = {
    watch: {
      create: jest.fn(({ data }: { data: { maxPrice?: string } }) =>
        Promise.resolve({ id: 3, ...data, maxPrice: data.maxPrice ? new Prisma.Decimal(data.maxPrice) : null }),
      ),
      update: jest.fn(({ data }: { data: object }) => Promise.resolve({ id: 3, maxPrice: null, ...data })),
      findUnique: jest.fn().mockResolvedValue(existing),
      count: jest.fn().mockResolvedValue(count),
    },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const sync = { pushIfStale: jest.fn().mockResolvedValue(undefined) } as unknown as WatchSyncService;
  return { service: new WatchesService(prisma, audit, sync), tx, audit, sync };
}

describe('cleanAliases (F34)', () => {
  it('trims, lower-cases and de-duplicates, keeping order', () => {
    expect(cleanAliases([' 17 Pro Max ', '17PM', '17 pro max', '  '])).toEqual(['17 pro max', '17pm']);
  });
});

describe('WatchesService (F34)', () => {
  it('create cleans aliases, sets the creator and audits', async () => {
    const { service, tx, audit } = makeService();
    const res = await service.create({ name: 'iPhone 17', aliases: ['A', 'a'], maxPrice: '1300' }, 7);
    expect(tx.watch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ aliases: ['a'], createdById: 7 }) as object }),
    );
    expect(res.maxPrice).toBe('1300.00');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create', entity: 'Watch', entityId: 3, userId: 7 }),
      tx,
    );
  });

  it('create refuses the 201st watch with 409 and writes nothing', async () => {
    const { service, tx, audit } = makeService(undefined, 200);
    await expect(service.create({ name: 'x', aliases: ['x'] }, 7)).rejects.toThrow(ConflictException);
    expect(tx.watch.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('update audits before and after, then triggers a sync push', async () => {
    const { service, tx, audit, sync } = makeService();
    await service.update(3, { isActive: false }, 7);
    expect(sync.pushIfStale).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', before: expect.anything() as object, after: expect.objectContaining({ isActive: false }) as object }),
      tx,
    );
  });

  it('update with an empty body returns the watch without writing or auditing', async () => {
    const { service, tx, audit } = makeService();
    const res = await service.update(3, {}, 7);
    expect(res).toMatchObject({ id: 3 });
    expect(tx.watch.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('update returns 404 for an unknown watch', async () => {
    const { service, tx } = makeService(null);
    await expect(service.update(9, { name: 'x' }, 7)).rejects.toThrow(NotFoundException);
    expect(tx.watch.update).not.toHaveBeenCalled();
  });
});
