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
  cost: string;
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

/** Complete profit report structure with totals, groups and paginated lines. */
export interface ProfitReport {
  totals: ProfitTotals;
  byInvestor: ProfitGroup[];
  byLocation: ProfitGroup[];
  byCategory: ProfitGroup[];
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
