import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OwnerSnapshotService } from './owner-snapshot.service';

/**
 * Read-only home dashboard summary (F10); reuses the reports profit builder for BR-5 numbers.
 * Also hosts the daily owner Telegram snapshot cron (roadmap #1), which reads Telegram credentials
 * from IntegrationsModule (one direction only — integrations never imports dashboard).
 */
@Module({
  imports: [ReportsModule, IntegrationsModule],
  controllers: [DashboardController],
  providers: [DashboardService, OwnerSnapshotService],
})
export class DashboardModule {}
