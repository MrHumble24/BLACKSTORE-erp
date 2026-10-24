import { Injectable } from '@nestjs/common';
import { ConsignmentItemStatus, ItemStatus, Prisma, SaleStatus } from '@prisma/client';
import { lowStockIds } from '../accessory-stock/low-stock';
import type { PublicUser } from '../common/auth-user';
import { endOfDay, startOfToday } from '../common/dates';
import { hasPermission } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ProfitReportService } from '../reports/profit-report.service';
import { debtBalanceOf, debtSaleSelect } from '../sales/sale-totals';

/** Lean select for a recent-sales row: only the fields the dashboard list renders. */
const recentSaleSelect = {
  id: true,
  createdAt: true,
  status: true,
  total: true,
  customer: { select: { name: true } },
} satisfies Prisma.SaleSelect;

/**
 * Home dashboard snapshot (F10). One parallel batch of reads, no writes. Profit fields (today's
 * gross profit and the month's net profit, BR-5) are only computed and returned for view_profit;
 * cost is never exposed here. Debt is summed from records (BR-8).
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profit: ProfitReportService,
  ) {}

  /** Builds the role-masked summary; all reads run in parallel (no N+1). */
  async summary(actor: PublicUser) {
    const canViewProfit = hasPermission(actor, 'view_profit');
    const today = startOfToday();
    const [todaySales, stock, lowStockCount, debts, overdueCount, recentSales, todayProfit, monthProfit] =
      await Promise.all([
        this.todaySales(today),
        this.stockCounts(),
        lowStockIds(this.prisma).then((ids) => ids.length),
        this.customerDebt(),
        this.overdueConsignments(today),
        this.recentSales(),
        canViewProfit ? this.profit.profitFor({ gte: today, lte: endOfDay(today) }) : null,
        canViewProfit ? this.profit.profitFor(monthRange(today)) : null,
      ]);
    return {
      today: {
        ...todaySales,
        ...(todayProfit ? { profit: todayProfit.gross.toFixed(2) } : {}),
      },
      stock,
      // Count of accessory rows at/under their alert threshold (#7); stock info, visible to staff.
      lowStockCount,
      debts,
      partners: { overdueCount },
      ...(monthProfit ? { monthNetProfit: monthProfit.net.toFixed(2) } : {}),
      recentSales,
    };
  }

  /** Count and revenue of every sale created today (local midnight to now). */
  private async todaySales(today: Date) {
    const { _count: count, _sum: sum } = await this.prisma.sale.aggregate({
      _count: true,
      _sum: { total: true },
      where: { createdAt: { gte: today } },
    });
    return { salesCount: count, salesTotal: (sum.total ?? new Prisma.Decimal(0)).toFixed(2) };
  }

  /** Device item counts by status (devices are Items; accessories are tracked separately). */
  private async stockCounts() {
    const [inStockDevices, atPartnerDevices] = await Promise.all([
      this.prisma.item.count({ where: { status: ItemStatus.IN_STOCK } }),
      this.prisma.item.count({ where: { status: ItemStatus.AT_PARTNER } }),
    ]);
    return { inStockDevices, atPartnerDevices };
  }

  /**
   * Outstanding customer debt summed from DEBT sales (BR-8): Σ balance and the count of distinct
   * customers still owing. One query; balances computed from loaded payments/returns.
   */
  private async customerDebt() {
    const sales = await this.prisma.sale.findMany({
      where: { status: SaleStatus.DEBT, customerId: { not: null } },
      select: { customerId: true, ...debtSaleSelect },
    });
    const debtors = new Set<number>();
    let total = new Prisma.Decimal(0);
    for (const s of sales) {
      const balance = debtBalanceOf(s);
      if (s.customerId != null && balance.gt(0)) {
        total = total.plus(balance);
        debtors.add(s.customerId);
      }
    }
    return { customerDebtTotal: total.toFixed(2), debtorCount: debtors.size };
  }

  /** Consignment items still at a partner past their consignment's due date (unsold, overdue). */
  private overdueConsignments(today: Date): Promise<number> {
    return this.prisma.consignmentItem.count({
      where: { status: ConsignmentItemStatus.AT_PARTNER, consignment: { dueDate: { lt: today } } },
    });
  }

  /** The five newest sales, mapped to the dashboard row shape. */
  private async recentSales() {
    const rows = await this.prisma.sale.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: recentSaleSelect,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.createdAt.toISOString(),
      customer: r.customer?.name ?? null,
      total: r.total.toFixed(2),
      status: r.status,
    }));
  }
}

/** Local { gte, lte } bounds of the calendar month that contains `day`. */
function monthRange(day: Date): { gte: Date; lte: Date } {
  return {
    gte: new Date(day.getFullYear(), day.getMonth(), 1, 0, 0, 0, 0),
    lte: new Date(day.getFullYear(), day.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}
