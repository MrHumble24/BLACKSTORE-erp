import { PrismaService } from '../prisma/prisma.service';
import { WatchSyncService } from './watch-sync.service';
import { SyncResult, WatcherClientService } from './watcher-client.service';
import { WatcherHealthService } from './watcher-health.service';

const OLD = new Date('2026-10-27T10:00:00Z');
const NEW = new Date('2026-10-27T11:00:00Z');
const row = (id: number, syncedAt: Date | null, updatedAt: Date) => ({
  id, name: `w${id}`, aliases: [], maxPrice: null, currency: 'USD', isActive: true, syncedAt, updatedAt,
});

/** Sync service over a mocked Prisma and Watcher client. */
function make(
  rows: ReturnType<typeof row>[],
  push: () => Promise<SyncResult> = () => Promise.resolve({ ok: true, status: 200 }),
  configured = true,
) {
  const watch = {
    findMany: jest.fn().mockResolvedValue(rows),
    updateMany: jest.fn((args: object) => args),
    count: jest.fn().mockResolvedValue(0),
    fields: { updatedAt: 'updatedAt' },
  };
  const prisma = { watch, $transaction: jest.fn().mockResolvedValue([]) } as unknown as PrismaService;
  const client = { isConfigured: () => configured, syncAll: jest.fn(push), ping: jest.fn().mockResolvedValue({ ok: false }) };
  const health = { record: jest.fn(), snapshot: () => ({ reachable: false, lastOkAt: null }) };
  const service = new WatchSyncService(
    prisma,
    client as unknown as WatcherClientService,
    health as unknown as WatcherHealthService,
  );
  return { service, watch, prisma, client, health };
}

describe('WatchSyncService (F34)', () => {
  it('does not push or ping on a write trigger when nothing is stale', async () => {
    const { service, client } = make([row(1, NEW, NEW)]);
    await service.pushIfStale();
    expect(client.syncAll).not.toHaveBeenCalled();
    expect(client.ping).not.toHaveBeenCalled();
  });

  it('cron pings the Watcher when nothing is stale and records the heartbeat', async () => {
    const { service, client, health } = make([row(1, NEW, NEW)]);
    await service.tick();
    expect(client.syncAll).not.toHaveBeenCalled();
    expect(client.ping).toHaveBeenCalledTimes(1);
    expect(health.record).toHaveBeenCalledWith({ ok: false });
  });

  it('cron records the push result instead of pinging when something is stale', async () => {
    const { service, client, health } = make([row(2, null, OLD)]);
    await service.tick();
    expect(client.ping).not.toHaveBeenCalled();
    expect(health.record).toHaveBeenCalledWith({ ok: true, status: 200 });
  });

  it('status reports reachable null when the Watcher is unconfigured', async () => {
    await expect(make([], undefined, false).service.status()).resolves.toMatchObject({ configured: false, reachable: null });
    await expect(make([]).service.status()).resolves.toMatchObject({ configured: true, reachable: false, lastOkAt: null });
  });

  it('pushes all watches, then marks only the stale ones with the read-before-push updatedAt', async () => {
    const rows = [row(1, NEW, NEW), row(2, null, OLD), row(3, OLD, NEW)];
    const { service, client, watch, prisma } = make(rows);
    await service.pushIfStale();
    expect(client.syncAll).toHaveBeenCalledWith(rows);
    expect(watch.updateMany).toHaveBeenCalledTimes(2);
    const calls = watch.updateMany.mock.calls.map(([a]) => a as { where: object; data: { syncedAt: Date; updatedAt: Date } });
    expect(calls.map((c) => c.where)).toEqual([{ id: 2, updatedAt: OLD }, { id: 3, updatedAt: NEW }]);
    expect(calls[0].data.syncedAt).toBe(calls[0].data.updatedAt);
    expect(calls[1].data.syncedAt).toBe(calls[0].data.syncedAt); // one shared t
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('marks nothing when the push fails', async () => {
    const { service, watch } = make([row(2, null, OLD)], () => Promise.resolve({ ok: false, status: 500 }));
    await service.pushIfStale();
    expect(watch.updateMany).not.toHaveBeenCalled();
  });

  it('runs a single push when called concurrently', async () => {
    let release!: (r: SyncResult) => void;
    const { service, client } = make([row(2, null, OLD)], () => new Promise((r) => (release = r)));
    const first = service.pushIfStale();
    await service.pushIfStale(); // returns at once: a push is in flight
    await new Promise(setImmediate); // let the first call reach syncAll
    release({ ok: true, status: 200 });
    await first;
    expect(client.syncAll).toHaveBeenCalledTimes(1);
  });
});
