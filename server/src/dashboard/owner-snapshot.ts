/**
 * Pure builder for the owner's daily Telegram snapshot (roadmap #1). Kept out of the service so it
 * is trivial to unit-test. Every value below is a number or a decimal string from the dashboard, so
 * nothing untrusted is interpolated; if names/categories are added later, escapeHtml them first
 * (see accessory-stock/low-stock.ts for the pattern).
 */

/** The profit-inclusive dashboard figures the snapshot renders (subset of DashboardService.collect). */
export interface OwnerSnapshotData {
  today: { salesCount: number; salesTotal: string; profit?: string };
  stock: { inStockDevices: number; atPartnerDevices: number };
  lowStockCount: number;
  debts: { customerDebtTotal: string; debtorCount: number };
  partners: { overdueCount: number };
  monthNetProfit?: string;
}

/**
 * `$1 500.00` — `$` prefix, 2 decimals, thousands grouped with a non-breaking space.
 * Mirrors the client's formatMoney (shared/lib/formatMoney.ts), which treats "," as a decimal
 * separator, so grouping must use a space — not toLocaleString's comma.
 */
function money(amount: string): string {
  const [whole = '0', decimals = '00'] = Number(amount).toFixed(2).split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${decimals}`;
}

/** `24.10.2026` — day.month.year, the format the finance surfaces use. */
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
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
