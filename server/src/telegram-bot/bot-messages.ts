/**
 * Pure builders for the bot's button replies (F22). Customer/investor texts are bilingual (uz, then
 * ru) like the F17/F18 builders; the owner's debtors list is Uzbek. HTML parse mode: every free-text
 * value (customer names, device names, shop name) is escaped so Telegram never rejects the message.
 */
import { formatDate } from '../common/dates';
import { escapeHtml } from '../common/html';
import { money } from '../common/money';
import type { WarrantyItem } from '../customer-notifications/customer-messages';
import { monthLabel } from '../investor-notifications/investor-messages';

/** One debtor in the owner's list; amount is a decimal string. */
export interface DebtorLine {
  name: string;
  amount: string;
}

/** Shop name header shared by the customer replies. */
const header = (shopName: string): string => `<b>${escapeHtml(shopName)}</b>`;

/** Owner's top debtors plus the grand total over ALL debtors (`count` of them); empty → "no debtors". */
export function buildDebtorsText(top: DebtorLine[], total: string, count: number): string {
  if (count === 0) return "✅ Qarzdor yo'q";
  return [
    '<b>Qarzdorlar</b>',
    ...top.map((d) => `• ${escapeHtml(d.name)} — ${money(d.amount)}`),
    '',
    `Jami: ${money(total)} (${count} mijoz)`,
  ].join('\n');
}

/** Bilingual "you owe nothing" for a customer's "Mening qarzim" button. */
export function buildNoDebtText(shopName: string): string {
  return [header(shopName), "✅ Sizda qarz yo'q. / У вас нет долга."].join('\n');
}

/** Bilingual list of the customer's devices still under warranty; empty → "none under warranty". */
export function buildWarrantyListText(shopName: string, items: WarrantyItem[]): string {
  if (items.length === 0) {
    return [header(shopName), "Kafolatdagi qurilma yo'q. / Устройств на гарантии нет."].join('\n');
  }
  const uz = items.map((i) => `• ${escapeHtml(i.device)} — ${formatDate(i.until)} gacha`);
  const ru = items.map((i) => `• ${escapeHtml(i.device)} — до ${formatDate(i.until)}`);
  return [header(shopName), '🛡 Kafolatdagi qurilmalaringiz:', ...uz, '', '🛡 Ваши устройства на гарантии:', ...ru].join(
    '\n',
  );
}

/** Bilingual "no activity" for an investor month (`YYYY-MM`) with no report row. */
export function buildNoActivityText(month: string): string {
  return [`📊 ${monthLabel(month)}`, "Bu oyda harakat yo'q. / В этом месяце движений нет."].join('\n');
}
