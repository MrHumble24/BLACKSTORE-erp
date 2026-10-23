import type { Page } from '@/shared/types';

export type ProfitLineKind = 'SALE' | 'RETURN';

/** One line in the profit report representing a sale or return. */
export interface ProfitLine {
  kind: ProfitLineKind;
  saleId: number;
  saleItemId: number;
  returnId: number | null;
  profitDate: string;
  item: { id: number; code: string; model: string } | null;
  productModel: string;
  quantity: number;
  investor: { id: number; name: string } | null;
  location: { id: number; name: string };
  category: { id: number; name: string };
  salePrice: string;
  refunded: string;
  cost: string;
  profit: string;
  investorShare: string;
  businessShare: string;
}

/** Aggregated totals for the profit report. */
export interface ProfitTotals {
  sales: string;
  refunded: string;
  /** Omitted by the server for users without `view_cost`. */
  cost?: string;
  profit: string;
  investorShare: string;
  businessShare: string;
  expenses: string;
  otherIncome: string;
  netProfit: string;
}

/** Group breakdown summary (by investor, location, or category). */
export interface ProfitGroup {
  id: number;
  name: string;
  quantity: number;
  sales: string;
  profit: string;
  investorShare: string;
  businessShare: string;
}

/** Daily time-series bucket for sales and profit trends. */
export interface ProfitDailyTrend {
  date: string;
  quantity: number;
  sales: string;
  cost?: string;
  profit: string;
}

/** Operational counts for the period. */
export interface ProfitSummary {
  transactions: number;
  unitsSold: number;
  returnCount: number;
}

/** One weekday × hour sales bucket for the activity heatmap. */
export interface ProfitHeatmapBucket {
  weekday: number; // 0=Sun .. 6=Sat
  hour: number; // 0..23
  count: number;
  sales: string;
}

/** A sale line whose gross margin fell below the watchlist threshold. */
export interface ProfitLowMarginLine {
  saleId: number;
  saleItemId: number;
  item: { id: number; code: string; model: string } | null;
  productModel: string;
  salePrice: string;
  profit: string;
  marginPct: number;
}

/** Complete profit report structure with totals, groups and paginated lines. */
export interface ProfitReport {
  totals: ProfitTotals;
  /** Same totals for the equal-length period just before this one, for deltas; null when no date range. */
  previous: ProfitTotals | null;
  /** Operational counts (transactions, units sold, returns). */
  summary: ProfitSummary;
  byInvestor: ProfitGroup[];
  byLocation: ProfitGroup[];
  byCategory: ProfitGroup[];
  /** Top product models by gross profit (max 8). */
  topModels: ProfitGroup[];
  dailyTrends?: ProfitDailyTrend[];
  /** Prior-period daily series, aligned by index for the comparison overlay. */
  previousTrends: ProfitDailyTrend[];
  /** Sales by weekday × hour (non-empty buckets only). */
  heatmap: ProfitHeatmapBucket[];
  /** Thin-margin sale lines, worst first (max 8). */
  lowMargin: ProfitLowMarginLine[];
  lines: Page<ProfitLine>;
}

export interface ProfitReportFilters {
  from?: string;
  to?: string;
  investorId?: number;
  locationId?: number;
  categoryId?: number;
}

/** One investor summary row in the monthly investor report. */
export interface InvestorReportRow {
  investor: { id: number; name: string; isOwn: boolean };
  itemsSold: number;
  sales: string;
  cost: string;
  profit: string;
  investorShare: string;
  businessShare: string;
}

/** Monthly investor report structure with rows and totals. */
export interface InvestorReport {
  month: string;
  rows: InvestorReportRow[];
  totals: Omit<InvestorReportRow, 'investor'>;
}
