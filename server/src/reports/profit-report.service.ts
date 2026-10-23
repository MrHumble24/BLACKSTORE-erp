import { Injectable } from '@nestjs/common';
import { LedgerType, Prisma } from '@prisma/client';
import { dateRange } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProfitDto } from './dto/query-profit.dto';
import { groupLines, ProfitLine, sumLines } from './profit-lines';
import { loadReportLines, Period } from './report-sales';
import { ACCESSORIES, toProfitGroup, toProfitLine, toProfitTotals } from './report-shape';

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
    const lines = (await loadReportLines(this.prisma, period, this.saleWhere(query)))
      .filter((l) => this.inScope(l, query))
      .sort(byNewest);
    const totals = sumLines(lines);
    const { expenses, otherIncome } = await this.ledgerTotals(period);
    const start = (query.page - 1) * query.pageSize;
    return {
      totals: toProfitTotals(totals, expenses, otherIncome, canViewCost),
      byInvestor: groupLines(lines, (l) => l.investor ?? ACCESSORIES).map(toProfitGroup),
      byLocation: groupLines(lines, (l) => l.location).map(toProfitGroup),
      byCategory: groupLines(lines, (l) => l.category).map(toProfitGroup),
      lines: {
        items: lines.slice(start, start + query.pageSize).map((l) => toProfitLine(l, canViewCost)),
        total: lines.length,
        page: query.page,
        pageSize: query.pageSize,
      },
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
