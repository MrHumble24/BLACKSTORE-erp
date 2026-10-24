import { Injectable } from '@nestjs/common';
import { LedgerType, Prisma } from '@prisma/client';
import { dateRange } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProfitDto } from './dto/query-profit.dto';
import { heatmapBuckets, lowMargin, summarize } from './profit-analytics';
import { groupLines, groupLinesByDate, ProfitLine, sumLines } from './profit-lines';
import { loadReportLines, Period } from './report-sales';
import { profitReportToXlsx } from './report-xlsx';
import {
  ACCESSORIES,
  toDailyTrend,
  toHeatmapBucket,
  toLowMargin,
  toProfitGroup,
  toProfitLine,
  toProfitTotals,
} from './report-shape';

/**
 * Profit report (FR-28, BR-1 to BR-6). Builds SALE and RETURN lines for PAID/RETURNED sales
 * active in the period, filters them by profitDate and the query, then totals, groups and pages them.
 * ponytail: every sale touched in the period (with all its lines) is held in memory; fine for a
 * shop's monthly volume, add SQL aggregation if a period ever grows past ~50k lines.
 */
@Injectable()
export class ProfitReportService {
  constructor(private readonly prisma: PrismaService) {}

  async report(query: QueryProfitDto, canViewCost: boolean) {
    const period = dateRange(query.from, query.to);
    // Current lines, current-period ledger and the prior-period totals are independent — load in parallel.
    const [lines, ledger, previous] = await Promise.all([
      this.loadScopedLines(period, query),
      this.ledgerTotals(period),
      this.previousData(period, query, canViewCost),
    ]);
    const totals = sumLines(lines);
    const start = (query.page - 1) * query.pageSize;
    return {
      totals: toProfitTotals(totals, ledger.expenses, ledger.otherIncome, canViewCost),
      previous: previous?.totals ?? null,
      previousTrends: previous?.trends ?? [],
      summary: summarize(lines),
      byInvestor: groupLines(lines, (l) => l.investor ?? ACCESSORIES).map(toProfitGroup),
      byLocation: groupLines(lines, (l) => l.location).map(toProfitGroup),
      byCategory: groupLines(lines, (l) => l.category).map(toProfitGroup),
      topModels: topModelsByProfit(lines),
      dailyTrends: groupLinesByDate(lines).map((t) => toDailyTrend(t, canViewCost)),
      heatmap: heatmapBuckets(lines).map(toHeatmapBucket),
      lowMargin: lowMargin(lines, query.lowMarginPct).map(toLowMargin),
      lines: {
        items: lines.slice(start, start + query.pageSize).map((l) => toProfitLine(l, canViewCost)),
        total: lines.length,
        page: query.page,
        pageSize: query.pageSize,
      },
    };
  }

  /**
   * Gross line profit and net profit (BR-5) over a period, reusing the report line builder and the
   * same ledger rule as the report. Used by the dashboard summary; no grouping/paging overhead.
   */
  async profitFor(period: Period): Promise<{ gross: Prisma.Decimal; net: Prisma.Decimal }> {
    const [lines, ledger] = await Promise.all([loadReportLines(this.prisma, period), this.ledgerTotals(period)]);
    const gross = sumLines(lines).profit;
    return { gross, net: gross.minus(ledger.expenses).plus(ledger.otherIncome) };
  }

  /** Loads the report lines for a period, filtered to the query scope and ordered newest first. */
  private async loadScopedLines(period: Period, query: QueryProfitDto) {
    return (await loadReportLines(this.prisma, period, this.saleWhere(query)))
      .filter((l) => this.inScope(l, query))
      .sort(byNewest);
  }

  /**
   * Totals and daily series of the equal-length period immediately before this one, for the
   * period-over-period delta and the comparison overlay. Null when the query has no closed date
   * range. Loads the prior lines once and reuses them for both. Fine at a shop's monthly volume.
   */
  private async previousData(period: Period, query: QueryProfitDto, canViewCost: boolean) {
    const prev = previousPeriod(period);
    if (!prev) return null;
    const [lines, ledger] = await Promise.all([this.loadScopedLines(prev, query), this.ledgerTotals(prev)]);
    return {
      totals: toProfitTotals(sumLines(lines), ledger.expenses, ledger.otherIncome, canViewCost),
      trends: groupLinesByDate(lines).map((t) => toDailyTrend(t, canViewCost)),
    };
  }

  /** The profit report as an .xlsx workbook, with the date range for the file name. */
  async xlsx(query: QueryProfitDto, canViewCost: boolean): Promise<{ from: string; to: string; buffer: Buffer }> {
    const period = dateRange(query.from, query.to);
    const [lines, ledger] = await Promise.all([this.loadScopedLines(period, query), this.ledgerTotals(period)]);
    const totals = toProfitTotals(sumLines(lines), ledger.expenses, ledger.otherIncome, canViewCost);
    return {
      from: query.from ?? 'all',
      to: query.to ?? 'all',
      buffer: await profitReportToXlsx({ totals, lines: lines.map((l) => toProfitLine(l, canViewCost)), canViewCost }),
    };
  }

  /** Sale-level prefilter from the query: location, and sales having a line of the investor/category. */
  private saleWhere(query: QueryProfitDto): Prisma.SaleWhereInput {
    return {
      locationId: query.locationId,
      items:
        query.investorId || query.categoryId
          ? {
              some: {
                investorId: query.investorId,
                productModel: query.categoryId ? { categoryId: query.categoryId } : undefined,
              },
            }
          : undefined,
    };
  }

  /** Keeps a line that matches the line-level filters (the period is already applied). */
  private inScope(line: ProfitLine, query: QueryProfitDto): boolean {
    if (query.investorId && line.investor?.id !== query.investorId) return false;
    if (query.categoryId && line.category.id !== query.categoryId) return false;
    return true;
  }

  /** Ledger expenses and profit-counting other income over the same period (BR-5). */
  private async ledgerTotals(period: Period) {
    const [exp, inc] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: { type: LedgerType.EXPENSE, date: period } }),
      this.prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { type: LedgerType.INCOME, countsInProfit: true, date: period },
      }),
    ]);
    const { _sum: expSum } = exp;
    const { _sum: incSum } = inc;
    return {
      expenses: expSum.amount ?? new Prisma.Decimal(0),
      otherIncome: incSum.amount ?? new Prisma.Decimal(0),
    };
  }
}

/** Stable page order: newest profitDate first, then saleItemId. */
function byNewest(a: ProfitLine, b: ProfitLine): number {
  return b.profitDate.getTime() - a.profitDate.getTime() || a.saleItemId - b.saleItemId;
}

/** Top 8 product models by gross profit (ties broken by sales), as ProfitGroup rows. */
function topModelsByProfit(lines: ProfitLine[]) {
  return groupLines(lines, (l) => l.model)
    .filter((g) => g.id !== 0)
    .sort((a, b) => b.profit.comparedTo(a.profit) || b.sales.comparedTo(a.sales))
    .slice(0, 8)
    .map(toProfitGroup);
}

/** The equal-length window ending the instant before `period` starts, or undefined if unbounded. */
function previousPeriod(period: Period): Period {
  if (!period?.gte || !period?.lte) return undefined;
  const span = period.lte.getTime() - period.gte.getTime();
  const lte = new Date(period.gte.getTime() - 1);
  return { gte: new Date(period.gte.getTime() - 1 - span), lte };
}
