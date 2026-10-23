import { Prisma } from '@prisma/client';
import { HeatmapAcc, LowMarginAcc } from './profit-analytics';
import { DailyTrendAcc, LineTotals, ProfitGroupAcc, ProfitLine } from './profit-lines';

/** Accessory group id/name used when an investor is null (ProfitGroup needs a numeric id). */
export const ACCESSORIES = { id: 0, name: 'Accessories' };

/** Maps one line to the API ProfitLine; the `cost` field is dropped without view_cost. */
export function toProfitLine(line: ProfitLine, canViewCost: boolean) {
  const base = {
    kind: line.kind,
    saleId: line.saleId,
    saleItemId: line.saleItemId,
    returnId: line.returnId,
    profitDate: line.profitDate.toISOString(),
    item: line.item,
    productModel: line.productModel,
    quantity: line.quantity,
    investor: line.investor,
    location: line.location,
    category: line.category,
    salePrice: line.salePrice.toFixed(2),
    refunded: line.refunded.toFixed(2),
    profit: line.profit.toFixed(2),
    investorShare: line.investorShare.toFixed(2),
    businessShare: line.businessShare.toFixed(2),
  };
  return canViewCost ? { ...base, cost: line.cost.toFixed(2) } : base;
}

/** Maps an accumulated group to the API ProfitGroup. */
export function toProfitGroup(g: ProfitGroupAcc) {
  return {
    id: g.id,
    name: g.name,
    quantity: g.quantity,
    sales: g.sales.toFixed(2),
    profit: g.profit.toFixed(2),
    investorShare: g.investorShare.toFixed(2),
    businessShare: g.businessShare.toFixed(2),
  };
}

/** Maps a daily trend bucket to the API trend object, masking cost if not permitted. */
export function toDailyTrend(t: DailyTrendAcc, canViewCost: boolean) {
  const base = {
    date: t.date,
    quantity: t.quantity,
    sales: t.sales.toFixed(2),
    profit: t.profit.toFixed(2),
  };
  return canViewCost ? { ...base, cost: t.cost.toFixed(2) } : base;
}

/** Maps a heatmap cell to the API shape; `sales` 2-dp string, no cost (safe for all roles). */
export function toHeatmapBucket(b: HeatmapAcc) {
  return { weekday: b.weekday, hour: b.hour, count: b.count, sales: b.sales.toFixed(2) };
}

/** Maps a low-margin row to the API shape; profit stays (view_profit), cost is never present. */
export function toLowMargin(r: LowMarginAcc) {
  return {
    saleId: r.saleId,
    saleItemId: r.saleItemId,
    item: r.item,
    productModel: r.productModel,
    salePrice: r.salePrice.toFixed(2),
    profit: r.profit.toFixed(2),
    marginPct: r.marginPct,
  };
}

/** Builds ProfitTotals from the line totals plus ledger expenses/other income (BR-5). */
export function toProfitTotals(
  totals: LineTotals,
  expenses: Prisma.Decimal,
  otherIncome: Prisma.Decimal,
  canViewCost: boolean,
) {
  const netProfit = totals.profit.minus(expenses).plus(otherIncome);
  const base = {
    sales: totals.sales.toFixed(2),
    refunded: totals.refunded.toFixed(2),
    profit: totals.profit.toFixed(2),
    investorShare: totals.investorShare.toFixed(2),
    businessShare: totals.businessShare.toFixed(2),
    expenses: expenses.toFixed(2),
    otherIncome: otherIncome.toFixed(2),
    netProfit: netProfit.toFixed(2),
  };
  return canViewCost ? { ...base, cost: totals.cost.toFixed(2) } : base;
}
