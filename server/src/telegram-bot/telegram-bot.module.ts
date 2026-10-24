import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ReportsModule } from '../reports/reports.module';
import { SettingsModule } from '../settings/settings.module';
import { BotReportsService } from './bot-reports.service';
import { BotRoleService } from './bot-role.service';
import { TelegramBotService } from './telegram-bot.service';
import { LinkTokenService } from './link-token.service';
import { KnownChatService } from './known-chat.service';

/**
 * Inbound Telegram feature (F15 `/status`, F16 `/start` chat linking, F21 known-chat discovery, F22
 * button menu). Imports IntegrationsModule (credentials + feature flags + bot username),
 * DashboardModule (snapshot data), SettingsModule (shop name) and ReportsModule (investor figures);
 * none of them imports this module, so there is no cycle. ScheduleModule is already global (the
 * @Interval poll runs).
 * Exports LinkTokenService so F17/F18 can call `buildInviteLink(kind, refId)`.
 */
@Module({
  imports: [IntegrationsModule, DashboardModule, SettingsModule, ReportsModule],
  providers: [TelegramBotService, LinkTokenService, KnownChatService, BotRoleService, BotReportsService],
  exports: [LinkTokenService],
})
export class TelegramBotModule {}
