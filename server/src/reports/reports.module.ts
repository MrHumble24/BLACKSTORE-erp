import { Module } from '@nestjs/common';
import { InvestorReportService } from './investor-report.service';
import { ProfitReportService } from './profit-report.service';
import { ReportsController } from './reports.controller';

/** Finance reports feature (PRD F07, FR-28, FR-11). Read-only; no Prisma writes. */
@Module({
  controllers: [ReportsController],
  providers: [ProfitReportService, InvestorReportService],
  exports: [ProfitReportService],
})
export class ReportsModule {}
