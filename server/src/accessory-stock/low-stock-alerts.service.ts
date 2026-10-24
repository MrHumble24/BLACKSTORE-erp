import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sendMessage, telegramSkipReason } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildLowStockDigest, lowStockLines } from './low-stock';

/**
 * Daily low-stock Telegram digest (feature #7). Reads low accessory rows and sends one message;
 * silent when nothing is low; skips with a warning when Telegram is not configured. Never throws
 * out of the cron.
 */
@Injectable()
export class LowStockAlertsService {
  private readonly logger = new Logger(LowStockAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramConfigService,
  ) {}

  /** 08:00 daily digest; failures are logged, never thrown (the cron must keep running). */
  @Cron('0 8 * * *')
  async sendDailyDigest(): Promise<void> {
    try {
      // Super-admin can switch Telegram or this feature off; off = skip silently.
      if (!(await this.telegram.isFeatureEnabled('lowStockDigest'))) return;
      const { token, alertChatId: chatId } = await this.telegram.getCredentials();
      const skip = telegramSkipReason(token, chatId, 0); // no size check for text
      if (skip) {
        this.logger.warn(skip);
        return;
      }
      const text = buildLowStockDigest(await lowStockLines(this.prisma));
      if (!text) return; // nothing low → no message
      const ok = await sendMessage(token, chatId, text);
      if (!ok) this.logger.warn('Low-stock Telegram digest failed to send');
    } catch (e) {
      this.logger.error(`Low-stock digest failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
