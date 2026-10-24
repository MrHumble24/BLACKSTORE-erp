import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/** Read-only home dashboard summary (F10); reuses the reports profit builder for BR-5 numbers. */
@Module({
  imports: [ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
