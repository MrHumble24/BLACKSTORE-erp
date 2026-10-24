import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { getBotUpdates } from '../common/telegram';
import { DashboardService } from '../dashboard/dashboard.service';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { routeUpdate } from './commands';

/** How often to long-poll Telegram for new commands. Named so it is easy to find/tune. */
const POLL_INTERVAL_MS = 5000;

/**
 * Inbound Telegram poller (F15): long-polls `getUpdates` and routes commands (today only `/status`).
 * Gated on the SAME `ownerSnapshot` flag as the 21:00 push, so one toggle silences both. Never
 * overlaps itself and never throws out of the scheduler.
 */
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private inFlight = false; // prevents overlapping cycles if one poll runs long
  private offset: number | undefined; // in-memory ack cursor; a restart re-syncs (no DB column, YAGNI)

  constructor(
    private readonly dashboard: DashboardService,
    private readonly telegram: TelegramConfigService,
  ) {}

  /** Poll on a fixed interval; the whole cycle is guarded so a failure is logged, never thrown. */
  @Interval(POLL_INTERVAL_MS)
  async poll(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      // Off = skip silently (same flag as the push; isFeatureEnabled also respects the master switch).
      if (!(await this.telegram.isFeatureEnabled('ownerSnapshot'))) return;
      const { token, alertChatId } = await this.telegram.getCredentials();
      if (!token) return; // not configured → nothing to poll

      const updates = await getBotUpdates(token, this.offset);

      // Process from the very first poll — no backlog "seeding". /status is idempotent (it re-sends
      // the current snapshot), so the worst case after a restart is the owner seeing it once more;
      // dropping a real command to avoid that would be the wrong trade.
      // Sequential on purpose: process in order and ack each before the next, so a mid-batch crash
      // never re-runs an already-handled command. Batches are tiny (poll every 5s).
      for (const update of updates) {
        this.offset = update.updateId + 1; // ack this one even if routing is a no-op
        // eslint-disable-next-line no-await-in-loop
        await routeUpdate(update, { dashboard: this.dashboard, token, alertChatId });
      }
    } catch (e) {
      this.logger.error(`Telegram poll failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.inFlight = false;
    }
  }
}
