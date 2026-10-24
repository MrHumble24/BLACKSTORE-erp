import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { errorMessage, safeSend } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvestorReportService } from '../reports/investor-report.service';
import { buildInvestorReportText, previousMonth } from './investor-messages';

/**
 * 09:00 server-local on the 1st of each month. Named const so it is easy to find and could be made
 * configurable later. (Server-local because the whole shop runs in one timezone.)
 */
const REPORT_CRON = '0 9 1 * *';

/**
 * Monthly per-investor Telegram report (F18, roadmap #6). On the 1st, send every active investor who
 * linked their Telegram (`telegramChatId` set via /start, F16) their OWN previous-month figures.
 * Gated on the investorReports flag (default OFF). The month report is computed ONCE with
 * canViewCost=false (no raw cost ever reaches an investor); each investor gets only their own row,
 * extracted by id — never another investor's numbers or the whole-business totals. An investor with
 * no activity that month has no row and is skipped silently. Never throws out of the cron.
 */
@Injectable()
export class InvestorNotificationsService {
  private readonly logger = new Logger(InvestorNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramConfigService,
    private readonly reports: InvestorReportService,
  ) {}

  /** 1st-of-month investor reports; failures are logged, never thrown (the cron must keep running). */
  @Cron(REPORT_CRON)
  async sendMonthlyReports(): Promise<void> {
    try {
      if (!(await this.telegram.isFeatureEnabled('investorReports'))) return;
      const { token } = await this.telegram.getCredentials();
      if (!token) {
        this.logger.warn('Telegram not configured; skipping investor report cron');
        return;
      }
      const month = previousMonth(new Date());
      // One report for the whole month (no N+1); canViewCost=false drops any cost-of-goods column.
      const report = await this.reports.report({ month }, false);
      const rowById = new Map(report.rows.map((r) => [r.investor.id, r]));
      const investors = await this.prisma.investor.findMany({
        // Exclude the OWN/business investor: its report row folds in whole-business and accessory
        // figures, so it must never receive a per-investor message. (`not: true` keeps the null-isOwn
        // real investors — Prisma's `not` includes nulls.)
        where: { isActive: true, telegramChatId: { not: null }, isOwn: { not: true } },
        select: { id: true, name: true, telegramChatId: true },
      });
      for (const inv of investors) {
        const row = rowById.get(inv.id);
        if (!row || !inv.telegramChatId) continue; // no activity this month → send nothing
        const text = buildInvestorReportText({
          month,
          investorName: inv.name,
          sales: row.sales,
          profit: row.profit,
          share: row.investorShare,
        });
        // eslint-disable-next-line no-await-in-loop -- sequential sends; one failure must not stop the rest
        await safeSend(this.logger, token, inv.telegramChatId, text, 'Investor report');
      }
    } catch (e) {
      this.logger.error(`Investor report cron failed: ${errorMessage(e)}`);
    }
  }
}
