import { Injectable } from '@nestjs/common';
import { ConsignmentItemStatus, ItemStatus, MatchStatus, Prisma, SaleStatus } from '@prisma/client';
import { lowStockIds } from '../accessory-stock/low-stock';
import type { PublicUser } from '../common/auth-user';
import { endOfDay, startOfToday } from '../common/dates';
import { hasPermission } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ProfitReportService } from '../reports/profit-report.service';
import { debtBalanceOf, debtSaleSelect } from '../sales/sale-totals';
import type { OwnerSnapshotData } from './owner-snapshot';

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

  /**
   * Builds the role-masked summary; profit is shown only to view_profit. `newMatchCount` (F34,
   * Watcher matches still NEW) only for manage_watches, and only here so the owner snapshot is unchanged.
   */
  async summary(actor: PublicUser) {
    const canViewProfit = hasPermission(actor, 'view_profit');
    const canViewCost = hasPermission(actor, 'view_cost') || canViewProfit;
    const canManageWatches = hasPermission(actor, 'manage_watches');
    const [data, newMatchCount] = await Promise.all([
      this.collect(canViewProfit, canViewCost),
      canManageWatches ? this.prisma.match.count({ where: { status: MatchStatus.NEW } }) : null,
    ]);
    return { ...data, ...(newMatchCount !== null ? { newMatchCount } : {}) };
  }

  /**
   * Owner Telegram snapshot (roadmap #1): the same figures as the dashboard but always
   * profit-inclusive — it only ever goes to the owner's private chat (FR-29).
   */
  async ownerSnapshot(): Promise<OwnerSnapshotData> {
    return this.collect(true, true);
  }

  /** One parallel batch of reads (no N+1, no writes); profit fields included only when allowed. */
  private async collect(canViewProfit: boolean, canViewCost = true) {
    const today = startOfToday();
    const [todaySales, stock, lowStockCount, debts, overdueCount, recentSales, todayProfit, monthProfit] =
      await Promise.all([
        this.todaySales(today),
        this.stockValuation(canViewCost),
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

  /** Device and accessory balances with retail and cost valuations. */
  private async stockValuation(canViewCost: boolean) {
    const [inStockAgg, atPartnerAgg, atPartnerCostAgg, accQtyAgg, accList] = await Promise.all([
      this.prisma.item.aggregate({
        where: { status: ItemStatus.IN_STOCK },
        _count: true,
        _sum: { salePrice: true, purchasePrice: true, extraCost: true },
      }),
      this.prisma.consignmentItem.aggregate({
        where: { status: ConsignmentItemStatus.AT_PARTNER },
        _count: true,
        _sum: { minPrice: true },
      }),
      canViewCost
        ? this.prisma.item.aggregate({
            where: { status: ItemStatus.AT_PARTNER },
            _sum: { purchasePrice: true, extraCost: true },
          })
        : Promise.resolve(null),
      this.prisma.accessoryStock.aggregate({ _sum: { quantity: true } }),
      canViewCost
        ? this.prisma.accessoryStock.findMany({
            where: { quantity: { gt: 0 } },
            select: { quantity: true, avgCost: true },
          })
        : Promise.resolve([]),
    ]);

    const { _count: inStockDevices, _sum: inStockSum } = inStockAgg;
    const { _count: atPartnerDevices, _sum: atPartnerSum } = atPartnerAgg;
    const { _sum: accQtySum } = accQtyAgg;
    const inStockSale = inStockSum.salePrice ?? new Prisma.Decimal(0);
    const atPartnerSale = atPartnerSum.minPrice ?? new Prisma.Decimal(0);

    return {
      inStockDevices,
      atPartnerDevices,
      inStockSaleValue: inStockSale.toFixed(2),
      atPartnerSaleValue: atPartnerSale.toFixed(2),
      totalSaleValue: inStockSale.plus(atPartnerSale).toFixed(2),
      accessoriesCount: accQtySum.quantity ?? 0,
      ...computeStockCosts(canViewCost, inStockSum, atPartnerCostAgg, accList),
    };
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

interface CostSums {
  inStockCostValue?: string;
  atPartnerCostValue?: string;
  accessoriesCostValue?: string;
  totalCostValue?: string;
}

function computeStockCosts(
  canViewCost: boolean,
  inStockSum: { purchasePrice: Prisma.Decimal | null; extraCost: Prisma.Decimal | null },
  atPartnerCostAgg: { _sum: { purchasePrice: Prisma.Decimal | null; extraCost: Prisma.Decimal | null } } | null,
  accList: Array<{ quantity: number; avgCost: Prisma.Decimal }>,
): CostSums {
  if (!canViewCost || !atPartnerCostAgg || !accList) return {};
  const { _sum: partnerSum } = atPartnerCostAgg;
  const inStockCost = (inStockSum.purchasePrice ?? new Prisma.Decimal(0)).plus(
    inStockSum.extraCost ?? new Prisma.Decimal(0),
  );
  const atPartnerCost = (partnerSum.purchasePrice ?? new Prisma.Decimal(0)).plus(
    partnerSum.extraCost ?? new Prisma.Decimal(0),
  );
  const accCost = accList.reduce(
    (acc, a) => acc.plus(new Prisma.Decimal(a.quantity).mul(a.avgCost)),
    new Prisma.Decimal(0),
  );
  return {
    inStockCostValue: inStockCost.toFixed(2),
    atPartnerCostValue: atPartnerCost.toFixed(2),
    accessoriesCostValue: accCost.toFixed(2),
    totalCostValue: inStockCost.plus(atPartnerCost).plus(accCost).toFixed(2),
  };
}

