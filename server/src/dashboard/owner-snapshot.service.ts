import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sendMessage, telegramSkipReason } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { DashboardService } from './dashboard.service';
import { buildOwnerSnapshot } from './owner-snapshot';

/**
 * 21:00 server-local, end of the trading day. Named const so it is easy to find and could be made
 * configurable later. (Server-local because the whole shop runs in one timezone.)
 */
const SNAPSHOT_CRON = '0 21 * * *';

/**
 * Daily owner business snapshot (Telegram roadmap #1). Pushes the profit-inclusive dashboard figures
 * to the owner's Telegram once a day. Skips silently when the feature is off, warns + skips when
 * Telegram is not configured. Never throws out of the cron.
 */
@Injectable()
export class OwnerSnapshotService {
  private readonly logger = new Logger(OwnerSnapshotService.name);

  constructor(
    private readonly dashboard: DashboardService,
    private readonly telegram: TelegramConfigService,
  ) {}

  /** 21:00 daily snapshot; failures are logged, never thrown (the cron must keep running). */
  @Cron(SNAPSHOT_CRON)
  async sendDailySnapshot(): Promise<void> {
    try {
      // Super-admin can switch Telegram or this feature off; off = skip silently.
      if (!(await this.telegram.isFeatureEnabled('ownerSnapshot'))) return;
      // alertChatId must be the owner's private chat — this message contains profit (FR-29);
      // it must never go to a staff group. Reuse the existing owner-alerts channel, no new field.
      const { token, alertChatId: chatId } = await this.telegram.getCredentials();
      const skip = telegramSkipReason(token, chatId, 0); // no size check for text
      if (skip) {
        this.logger.warn(skip);
        return;
      }
      const text = buildOwnerSnapshot(await this.dashboard.ownerSnapshot(), new Date());
      const ok = await sendMessage(token, chatId, text);
      if (!ok) this.logger.warn('Owner snapshot Telegram message failed to send');
    } catch (e) {
      this.logger.error(`Owner snapshot failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
