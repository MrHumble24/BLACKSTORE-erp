/**
 * Pure builder for the owner's daily Telegram snapshot (roadmap #1). Kept out of the service so it
 * is trivial to unit-test. Every value below is a number or a decimal string from the dashboard, so
 * nothing untrusted is interpolated; if names/categories are added later, escapeHtml them first
 * (see common/html.ts).
 */
import { formatDate } from '../common/dates';
import { money } from '../common/money';

/** The profit-inclusive dashboard figures the snapshot renders (subset of DashboardService.collect). */
export interface OwnerSnapshotData {
  today: { salesCount: number; salesTotal: string; profit?: string };
  stock: {
    inStockDevices: number;
    atPartnerDevices: number;
    inStockSaleValue?: string;
    inStockCostValue?: string;
    atPartnerSaleValue?: string;
    atPartnerCostValue?: string;
    accessoriesCount?: number;
    accessoriesCostValue?: string;
    totalSaleValue?: string;
    totalCostValue?: string;
  };
  lowStockCount: number;
  debts: { customerDebtTotal: string; debtorCount: number };
  partners: { overdueCount: number };
  monthNetProfit?: string;
}

/** One concise HTML snapshot message (sendMessage sets parse_mode HTML). */
export function buildOwnerSnapshot(data: OwnerSnapshotData, date: Date): string {
  const lines = [
    `<b>📅 ${formatDate(date)}</b>`,
    '',
    '<b>Today</b>',
    `Sales: ${data.today.salesCount} — ${money(data.today.salesTotal)}`,
  ];
  if (data.today.profit !== undefined) lines.push(`Gross profit: ${money(data.today.profit)}`);
  if (data.monthNetProfit !== undefined) {
    lines.push('', '<b>This month</b>', `Net profit: ${money(data.monthNetProfit)}`);
  }
  lines.push(
    '',
    '<b>Stock</b>',
    `In stock: ${data.stock.inStockDevices}`,
    `At partner: ${data.stock.atPartnerDevices}`,
    `Low stock: ${data.lowStockCount}`,
    '',
    '<b>Money owed</b>',
    `Customers owe: ${money(data.debts.customerDebtTotal)} (${data.debts.debtorCount})`,
    `Overdue consignments: ${data.partners.overdueCount}`,
  );
  return lines.join('\n');
}
