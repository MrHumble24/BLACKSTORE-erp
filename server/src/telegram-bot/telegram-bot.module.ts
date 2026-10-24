import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TelegramBotService } from './telegram-bot.service';
import { LinkTokenService } from './link-token.service';
import { KnownChatService } from './known-chat.service';

/**
 * Inbound Telegram feature (F15 `/status`, F16 `/start` chat linking, F21 known-chat discovery).
 * Imports IntegrationsModule (credentials + feature flags + bot username) and DashboardModule (snapshot data); neither imports
 * this module, so there is no cycle. ScheduleModule is already global (the @Interval poll runs).
 * Exports LinkTokenService so F17/F18 can call `buildInviteLink(kind, refId)`.
 */
@Module({
  imports: [IntegrationsModule, DashboardModule],
  providers: [TelegramBotService, LinkTokenService, KnownChatService],
  exports: [LinkTokenService],
})
export class TelegramBotModule {}
