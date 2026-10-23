import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { hasPermission } from '../common/permissions';
import { QueryInvestorReportDto } from './dto/query-investor-report.dto';
import { QueryProfitDto } from './dto/query-profit.dto';
import { InvestorReportService } from './investor-report.service';
import { ProfitReportService } from './profit-report.service';

/** HTTP for finance reports (FR-28, FR-11); Admin-only via `view_profit`, cost columns via `view_cost`. */
@Controller('reports')
@Permissions('view_profit')
export class ReportsController {
  constructor(
    private readonly profit: ProfitReportService,
    private readonly investors: InvestorReportService,
  ) {}

  @Get('profit')
  profitReport(@Query() query: QueryProfitDto, @CurrentUser() actor: PublicUser) {
    return this.profit.report(query, hasPermission(actor, 'view_cost'));
  }

  @Get('investors')
  investorReport(@Query() query: QueryInvestorReportDto, @CurrentUser() actor: PublicUser) {
    return this.investors.report(query, hasPermission(actor, 'view_cost'));
  }

  // The same numbers as /reports/investors, streamed as an .xlsx attachment.
  @Get('investors.xlsx')
  async investorReportXlsx(
    @Query() query: QueryInvestorReportDto,
    @CurrentUser() actor: PublicUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { month, buffer } = await this.investors.xlsx(query, hasPermission(actor, 'view_cost'));
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="investors-${month}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }
}
