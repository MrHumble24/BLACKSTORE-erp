import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryInvestorReportDto } from './dto/query-investor-report.dto';
import { groupLines, LineTotals, ProfitGroupAcc, sumLines } from './profit-lines';
import { loadReportLines } from './report-sales';
import { investorReportToXlsx } from './report-xlsx';

/** Investor report for one month (FR-11): the same lines as the profit report, grouped by investor. */
@Injectable()
export class InvestorReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** One row per investor; accessory (null-investor) lines land in the own (business) row. */
  async report(query: QueryInvestorReportDto, canViewCost: boolean) {
    const own = await this.prisma.investor.findFirstOrThrow({
      where: { isOwn: true },
      select: { id: true, name: true },
    });
    const all = await loadReportLines(this.prisma, monthRange(query.month));
    const lines = query.investorId ? all.filter((l) => (l.investor?.id ?? own.id) === query.investorId) : all;
    const rows = groupLines(lines, (l) => l.investor ?? own);
    const itemsSold = rows.reduce((n, r) => n + r.quantity, 0);
    return {
      month: query.month,
      rows: rows.map((r) =>
        Object.assign({ investor: { id: r.id, name: r.name, isOwn: r.id === own.id } }, money(r, r.quantity, canViewCost)),
      ),
      totals: money(sumLines(lines), itemsSold, canViewCost),
    };
  }

  /** The same report as an .xlsx workbook, with the month for the file name. */
  async xlsx(query: QueryInvestorReportDto, canViewCost: boolean): Promise<{ month: string; buffer: Buffer }> {
    const report = await this.report(query, canViewCost);
    return { month: report.month, buffer: await investorReportToXlsx(report) };
  }
}

/** Local-time { gte, lte } bounds of a YYYY-MM month, `lte` the last ms of the last day. */
function monthRange(month: string): { gte: Date; lte: Date } {
  const [year, mo] = month.split('-').map(Number);
  return {
    gte: new Date(year, mo - 1, 1, 0, 0, 0, 0),
    lte: new Date(year, mo, 0, 23, 59, 59, 999),
  };
}

/** Money columns of a row or the totals as strings; `cost` is dropped without view_cost. */
function money(t: ProfitGroupAcc | LineTotals, itemsSold: number, canViewCost: boolean) {
  const base = {
    itemsSold,
    sales: t.sales.toFixed(2),
    profit: t.profit.toFixed(2),
    investorShare: t.investorShare.toFixed(2),
    businessShare: t.businessShare.toFixed(2),
  };
  return canViewCost ? { ...base, cost: t.cost.toFixed(2) } : base;
}
