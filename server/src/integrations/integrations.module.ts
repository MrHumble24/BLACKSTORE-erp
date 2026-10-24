import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { TelegramConfigService } from './telegram-config.service';

/**
 * Integrations feature (F12): in-app Telegram config. Exports TelegramConfigService so the
 * backup and low-stock senders read credentials from here (it imports neither, so no cycle).
 */
@Module({
  controllers: [IntegrationsController],
  providers: [TelegramConfigService],
  exports: [TelegramConfigService],
})
export class IntegrationsModule {}
