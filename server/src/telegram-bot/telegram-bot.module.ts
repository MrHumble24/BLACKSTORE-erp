import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TelegramBotService } from './telegram-bot.service';

/**
 * Inbound Telegram feature (F15): the `/status` command poller. Imports IntegrationsModule
 * (credentials + feature flag + owner chat id) and DashboardModule (snapshot data); neither imports
 * this module, so there is no cycle. ScheduleModule is already global (the @Interval poll runs).
 */
@Module({
  imports: [IntegrationsModule, DashboardModule],
  providers: [TelegramBotService],
})
export class TelegramBotModule {}
