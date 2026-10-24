import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { getBotUpdates } from '../common/telegram';
import { DashboardService } from '../dashboard/dashboard.service';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { BotReportsService } from './bot-reports.service';
import { BotRoleService } from './bot-role.service';
import { routeUpdate } from './commands';
import { KnownChatService } from './known-chat.service';
import { LinkTokenService } from './link-token.service';

/** How often to long-poll Telegram for new commands. Named so it is easy to find/tune. */
const POLL_INTERVAL_MS = 5000;

/**
 * Inbound Telegram poller (F15/F21): long-polls `getUpdates`, remembers each chat, routes commands.
 * Gated on the SAME `ownerSnapshot` flag as the 21:00 push, so one toggle silences both. Never
 * overlaps itself and never throws out of the scheduler.
 */
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private inFlight = false; // prevents overlapping cycles if one poll runs long
  private offset: number | undefined; // in-memory ack cursor; a restart re-syncs (no DB column, YAGNI)
  private offsetToken = ''; // the token `offset` belongs to

  constructor(
    private readonly dashboard: DashboardService,
    private readonly telegram: TelegramConfigService,
    private readonly linkToken: LinkTokenService,
    private readonly knownChats: KnownChatService,
    private readonly roles: BotRoleService,
    private readonly reports: BotReportsService,
  ) {}

  /** Poll on a fixed interval; the whole cycle is guarded so a failure is logged, never thrown. */
  @Interval(POLL_INTERVAL_MS)
  async poll(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      // ONE row read per cycle (getRuntime), not three. Gate the loop on the master switch only
      // (Telegram enabled + token present); each command gates itself below. `/status` keeps its
      // FR-29 gate via ownerSnapshotEnabled, so turning ownerSnapshot off still silences `/status`
      // while `/start` (any user) keeps working.
      const { enabled, token, alertChatId, ownerSnapshotEnabled, features } = await this.telegram.getRuntime();
      if (!enabled) return; // master switch off or not configured → nothing to poll
      // Update ids are per bot: after "Change bot" the old offset may sit above every new update id.
      if (token !== this.offsetToken) {
        this.offset = undefined;
        this.offsetToken = token;
      }

      const updates = await getBotUpdates(token, this.offset);

      // Process from the very first poll — no backlog "seeding". /status is idempotent (it re-sends
      // the current snapshot), so the worst case after a restart is the owner seeing it once more;
      // dropping a real command to avoid that would be the wrong trade.
      // Sequential on purpose: process in order and ack each before the next, so a mid-batch crash
      // never re-runs an already-handled command. Batches are tiny (poll every 5s).
      for (const update of updates) {
        this.offset = update.updateId + 1; // ack this one even if routing is a no-op
        // eslint-disable-next-line no-await-in-loop
        await this.knownChats.track(update); // never throws, so routing always runs
        // eslint-disable-next-line no-await-in-loop
        await routeUpdate(update, {
          dashboard: this.dashboard,
          linkToken: this.linkToken,
          roles: this.roles,
          reports: this.reports,
          token,
          alertChatId,
          ownerSnapshotEnabled,
          features,
          logger: this.logger,
        });
      }
    } catch (e) {
      this.logger.error(`Telegram poll failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.inFlight = false;
    }
  }
}
