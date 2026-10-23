import { Prisma } from '@prisma/client';
import { ProfitLine } from './profit-lines';

/**
 * Read-only KPI aggregations over report lines (FR-28 analytics extras). Pure functions, no cost:
 * summary and heatmap carry no money cost, lowMargin carries profit (view_profit) but never cost.
 */

const ZERO = new Prisma.Decimal(0);

/** KPI counts over the lines: distinct sales, units sold (SALE only), and number of returns. */
export function summarize(lines: ProfitLine[]): { transactions: number; unitsSold: number; returnCount: number } {
  const sales = new Set<number>();
  let unitsSold = 0;
  let returnCount = 0;
  for (const l of lines) {
    sales.add(l.saleId);
    if (l.kind === 'SALE') unitsSold += l.quantity;
    else returnCount += 1;
  }
  return { transactions: sales.size, unitsSold, returnCount };
}

/** One weekday×hour heatmap cell: how many SALE lines landed there and their sales total. */
export interface HeatmapAcc {
  weekday: number;
  hour: number;
  count: number;
  sales: Prisma.Decimal;
}

/** Buckets SALE lines by local weekday (0=Sun..6=Sat) and hour; only non-empty cells, weekday→hour order. */
export function heatmapBuckets(lines: ProfitLine[]): HeatmapAcc[] {
  const map = new Map<string, HeatmapAcc>();
  for (const l of lines) {
    if (l.kind !== 'SALE') continue;
    const weekday = l.profitDate.getDay();
    const hour = l.profitDate.getHours();
    const key = `${weekday}:${hour}`;
    const cell = map.get(key) ?? { weekday, hour, count: 0, sales: ZERO };
    cell.count += 1;
    cell.sales = cell.sales.plus(l.salePrice);
    map.set(key, cell);
  }
  return [...map.values()].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
}

/** A thin-margin SALE line for the watchlist (profit is allowed to view_profit users; never cost). */
export interface LowMarginAcc {
  saleId: number;
  saleItemId: number;
  item: { id: number; code: string; model: string } | null;
  productModel: string;
  salePrice: Prisma.Decimal;
  profit: Prisma.Decimal;
  marginPct: number;
}

/** SALE lines with salePrice>0 whose profit/salePrice% is below the threshold, worst first, capped at 8. */
export function lowMargin(lines: ProfitLine[], thresholdPct: number): LowMarginAcc[] {
  return lines
    .filter((l) => l.kind === 'SALE' && l.salePrice.greaterThan(0))
    .map((l) => ({ line: l, pct: l.profit.dividedBy(l.salePrice).times(100).toNumber() }))
    .filter((r) => r.pct < thresholdPct)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8)
    .map(({ line, pct }) => ({
      saleId: line.saleId,
      saleItemId: line.saleItemId,
      item: line.item,
      productModel: line.productModel,
      salePrice: line.salePrice,
      profit: line.profit,
      marginPct: Math.round(pct * 10) / 10,
    }));
}
