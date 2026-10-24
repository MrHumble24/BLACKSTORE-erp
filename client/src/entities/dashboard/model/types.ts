/** Home dashboard summary (GET /dashboard/summary). Admin-only money fields are
 * omitted by the server for users without view_profit, hence optional here. */

export type DashboardSaleStatus = 'PAID' | 'DEBT' | 'RETURNED';

export interface DashboardRecentSale {
  id: number;
  date: string;
  customer: string | null;
  total: string;
  status: DashboardSaleStatus;
}

export interface DashboardSummary {
  today: {
    salesCount: number;
    salesTotal: string;
    /** Today's gross profit — present only with view_profit. */
    profit?: string;
  };
  stock: {
    inStockDevices: number;
    atPartnerDevices: number;
  };
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
  recentSales: DashboardRecentSale[];
}
