import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ReportsModule } from '../reports/reports.module';
import { InvestorNotificationsService } from './investor-notifications.service';

/**
 * Monthly per-investor Telegram report cron (F18, roadmap #6). Imports IntegrationsModule
 * (credentials + feature flags) and ReportsModule (the per-investor report builder). Neither
 * imported module imports this one, so there is no cycle. ScheduleModule is already global (the cron
 * runs) and PrismaService is a global provider.
 */
@Module({
  imports: [IntegrationsModule, ReportsModule],
  providers: [InvestorNotificationsService],
})
export class InvestorNotificationsModule {}
