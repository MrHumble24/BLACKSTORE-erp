/** Home dashboard summary (GET /dashboard/summary). Admin-only money fields are
 * omitted by the server for users without view_profit/view_cost, hence optional here. */

export type DashboardSaleStatus = 'PAID' | 'DEBT' | 'RETURNED';

export interface DashboardRecentSale {
  id: number;
  date: string;
  customer: string | null;
  total: string;
  status: DashboardSaleStatus;
}

export interface DashboardStockSummary {
  inStockDevices: number;
  atPartnerDevices: number;
  /** Estimated retail / selling value for in-stock devices */
  inStockSaleValue?: string;
  /** Capital invested (cost) in in-stock devices — present only with view_cost / view_profit */
  inStockCostValue?: string;
  /** Estimated selling / handover value of items at partner */
  atPartnerSaleValue?: string;
  /** Cost value of items at partner — present only with view_cost / view_profit */
  atPartnerCostValue?: string;
  /** Total count of accessories in stock across all locations */
  accessoriesCount?: number;
  /** Cost value of accessory stock — present only with view_cost / view_profit */
  accessoriesCostValue?: string;
  /** Total retail value across all stock */
  totalSaleValue?: string;
  /** Total cost value across all stock — present only with view_cost / view_profit */
  totalCostValue?: string;
}

export interface DashboardSummary {
  today: {
    salesCount: number;
    salesTotal: string;
    /** Today's gross profit — present only with view_profit. */
    profit?: string;
  };
  stock: DashboardStockSummary;
  debts: {
    customerDebtTotal: string;
    debtorCount: number;
  };
  partners: {
    overdueCount: number;
  };
  /** Accessories at or below their low-stock threshold across all locations. */
  lowStockCount: number;
  /** Net profit this calendar month — present only with view_profit. */
  monthNetProfit?: string;
  /** Watcher offers still in NEW status — present only with manage_watches. */
  newMatchCount?: number;
  recentSales: DashboardRecentSale[];
}
