/**
 * Pure, testable builder for the monthly investor Telegram report (F18, roadmap #6). The message is
 * bilingual — an Uzbek block first, then a Russian block — and HTML (sendMessage sets parse_mode
 * HTML). Only ONE investor's own figures are ever rendered here; the cron never passes another
 * investor's numbers or the whole-business totals in. The investor name is free text, so it is
 * HTML-escaped (a name like "Ali & Co" would otherwise make Telegram reject the whole message).
 */
import { escapeHtml } from '../common/html';
import { money } from '../common/money';

/** One investor's own month figures; amounts are decimal strings straight from the report row. */
export interface InvestorReportData {
  month: string; // YYYY-MM
  investorName: string;
  sales: string; // decimal string
  profit: string;
  share: string; // this investor's own investorShare
}

/** Report data from one investor's own investor-report row (sales, profit, their share). */
export function investorReportData(
  month: string,
  investorName: string,
  row: { sales: string; profit: string; investorShare: string },
): InvestorReportData {
  return { month, investorName, sales: row.sales, profit: row.profit, share: row.investorShare };
}

/** Bilingual monthly report for ONE investor: period + their sales, profit and share. */
export function buildInvestorReportText(data: InvestorReportData): string {
  const name = escapeHtml(data.investorName);
  const period = monthLabel(data.month);
  const sales = money(data.sales);
  const profit = money(data.profit);
  const share = money(data.share);
  const uz = [
    `<b>${name}</b>`,
    `📊 ${period} oylik hisobot`,
    `Sotuvlar: ${sales}`,
    `Foyda: ${profit}`,
    `Sizning ulushingiz: ${share}`,
  ];
  const ru = [
    `📊 Отчёт за ${period}`,
    `Продажи: ${sales}`,
    `Прибыль: ${profit}`,
    `Ваша доля: ${share}`,
  ];
  return [...uz, '', ...ru].join('\n');
}

/** `YYYY-MM` → `MM.YYYY` for display (formatDate is day-level, meaningless for a whole-month report). */
export function monthLabel(month: string): string {
  const [year, mo] = month.split('-');
  return `${mo}.${year}`;
}

/**
 * The previous calendar month of `now` as `YYYY-MM`, correct across the year boundary: a 1-Jan run
 * returns the prior December of year−1 (new Date(y, -1, 1) rolls the month back a year for us).
 */
export function previousMonth(now: Date): string {
  return currentMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

/** The calendar month of `now` as `YYYY-MM` (the investor's "Shu oy" bot button). */
export function currentMonth(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
