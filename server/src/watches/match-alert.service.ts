import { Injectable, Logger } from '@nestjs/common';
import { errorMessage, safeSend, telegramSkipReason } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { buildMatchAlertText, MatchAlertInput } from './match-alert-text';

/**
 * Optional owner Telegram alert per new Watcher match (F34, flag `matchAlerts`, default off because
 * the Watcher's own bot already alerts the owner). Never throws: the webhook must answer 200.
 */
@Injectable()
export class MatchAlertService {
  private readonly logger = new Logger(MatchAlertService.name);

  constructor(private readonly telegram: TelegramConfigService) {}

  /** Sends the alert to `alertChatId` when Telegram and the flag are on; logs and swallows failures. */
  async notifyMatch(match: MatchAlertInput, watchName: string): Promise<void> {
    try {
      // One settings read: `enabled` = master switch on and a token present.
      const { enabled, token, alertChatId, features } = await this.telegram.getRuntime();
      if (!enabled || !features.matchAlerts) return;
      const skip = telegramSkipReason(token, alertChatId, 0);
      if (skip) {
        this.logger.warn(skip);
        return;
      }
      await safeSend(this.logger, token, alertChatId, buildMatchAlertText(match, watchName), 'Match alert');
    } catch (e) {
      this.logger.error(`Match alert failed: ${errorMessage(e)}`);
    }
  }
}
