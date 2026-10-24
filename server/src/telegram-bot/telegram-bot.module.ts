import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TelegramBotService } from './telegram-bot.service';
import { LinkTokenService } from './link-token.service';

/**
 * Inbound Telegram feature (F15 `/status` + F16 `/start` chat linking). Imports IntegrationsModule
 * (credentials + feature flags + bot username) and DashboardModule (snapshot data); neither imports
 * this module, so there is no cycle. ScheduleModule is already global (the @Interval poll runs).
 * Exports LinkTokenService so F17/F18 can call `buildInviteLink(kind, refId)`.
 */
@Module({
  imports: [IntegrationsModule, DashboardModule],
  providers: [TelegramBotService, LinkTokenService],
  exports: [LinkTokenService],
})
export class TelegramBotModule {}
