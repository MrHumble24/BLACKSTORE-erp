import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { errorMessage } from '../common/telegram';
import { PrismaService } from '../prisma/prisma.service';
import { WatcherClientService } from './watcher-client.service';
import { WatcherHealthService } from './watcher-health.service';

/** Watches whose last edit has not reached the Watcher yet. */
type Stale = { id: number; updatedAt: Date };

/**
 * Keeps the Watcher's watch list equal to the ERP's (F34, the ERP is the source of truth). A row is
 * stale while `syncedAt` is null or older than `updatedAt`; a failed push leaves it stale and the
 * minute cron retries, so a Watcher outage never loses an edit.
 */
@Injectable()
export class WatchSyncService {
  private readonly logger = new Logger(WatchSyncService.name);
  private inFlight = false; // one push at a time (cron and write triggers can overlap)

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WatcherClientService,
    private readonly health: WatcherHealthService,
  ) {}

  /**
   * Minute cron: pushes when something is stale, otherwise pings `/status`, so the heartbeat
   * (WatcherHealthService) gets one Watcher request per minute either way.
   */
  @Cron('*/1 * * * *')
  tick(): Promise<void> {
    return this.run(true);
  }

  /** Write trigger: pushes every watch when at least one is stale (no ping). Never throws. */
  pushIfStale(): Promise<void> {
    return this.run(false);
  }

  /** Pushes when stale (or pings when `ping` and nothing is stale), then marks the stale rows synced. */
  private async run(ping: boolean): Promise<void> {
    if (this.inFlight || !this.client.isConfigured()) return;
    this.inFlight = true;
    try {
      // ≤200 rows: one read serves both the stale check and the full push body.
      const watches = await this.prisma.watch.findMany({
        select: { id: true, name: true, aliases: true, maxPrice: true, currency: true, isActive: true, syncedAt: true, updatedAt: true },
        orderBy: { id: 'asc' },
      });
      const stale: Stale[] = watches.filter((w) => !w.syncedAt || w.syncedAt < w.updatedAt);
      if (stale.length === 0) {
        if (ping) await this.health.record(await this.client.ping());
        return;
      }
      const res = await this.client.syncAll(watches);
      await this.health.record(res);
      if (!res.ok) {
        this.logger.warn(`Watcher sync failed (status ${res.status ?? 'network'})`);
        return;
      }
      await this.markSynced(stale);
      this.logger.debug(`synced ${stale.length}`);
    } catch (e) {
      this.logger.warn(`Watcher sync failed: ${errorMessage(e)}`);
    } finally {
      this.inFlight = false;
    }
  }

  /** `{ configured, unsynced, reachable, lastOkAt }` for the Watches page banner; reachable is null when unconfigured. */
  async status() {
    const unsynced = await this.prisma.watch.count({
      where: { OR: [{ syncedAt: null }, { syncedAt: { lt: this.prisma.watch.fields.updatedAt } }] },
    });
    const configured = this.client.isConfigured();
    const { reachable, lastOkAt } = this.health.snapshot();
    return { configured, unsynced, reachable: configured ? reachable : null, lastOkAt };
  }

  /**
   * Marks pushed rows synced with one shared `t` for both columns (`@updatedAt` would otherwise move
   * past `syncedAt`). Matching on the `updatedAt` read before the push skips rows edited mid-push,
   * so they stay stale and go out next minute.
   */
  private async markSynced(stale: Stale[]): Promise<void> {
    const t = new Date();
    await this.prisma.$transaction(
      stale.map((w) =>
        this.prisma.watch.updateMany({ where: { id: w.id, updatedAt: w.updatedAt }, data: { syncedAt: t, updatedAt: t } }),
      ),
    );
  }
}
