import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sendMessage, telegramSkipReason } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  LOW_CANDIDATE_WHERE,
  LowStockLine,
  buildLowStockDigest,
  isLowStock,
} from './low-stock';

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
      const text = buildLowStockDigest(await this.lowStockLines());
      if (!text) return; // nothing low → no message
      const ok = await sendMessage(token, chatId, text);
      if (!ok) this.logger.warn('Low-stock Telegram digest failed to send');
    } catch (e) {
      this.logger.error(`Low-stock digest failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Low rows (model name, location name, quantity, threshold), ordered by model name. */
  private async lowStockLines(): Promise<LowStockLine[]> {
    const rows = await this.prisma.accessoryStock.findMany({
      where: LOW_CANDIDATE_WHERE,
      select: {
        quantity: true,
        productModel: { select: { name: true, lowStockThreshold: true } },
        location: { select: { name: true } },
      },
      orderBy: { productModel: { name: 'asc' } },
    });
    return rows
      .filter((r) => isLowStock(r.quantity, r.productModel.lowStockThreshold))
      .map((r) => ({
        model: r.productModel.name,
        location: r.location.name,
        quantity: r.quantity,
        threshold: r.productModel.lowStockThreshold ?? 0,
      }));
  }
}
