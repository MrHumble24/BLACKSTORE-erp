/**
 * Pure, testable builders for the customer-facing Telegram messages (F17): sale receipt, weekly debt
 * reminder, warranty-expiry reminder. Every message is bilingual — an Uzbek block first, then a
 * Russian block — and HTML (sendMessage sets parse_mode HTML). Every dynamic value (shop name,
 * device/model names) is HTML-escaped, reusing the escapeHtml helper, because a name like
 * "AirPods & Case" would otherwise make Telegram reject the whole message (400) and drop it silently.
 */
import { formatDate } from '../common/dates';
import { escapeHtml } from '../common/html';
import { money } from '../common/money';

/** One receipt line (model name is free text → escaped at render time). */
export interface ReceiptLine {
  model: string;
  quantity: number;
  unitPrice: string; // decimal string
}

/** Everything a sale receipt renders; totals are decimal strings straight from the sale. */
export interface ReceiptData {
  shopName: string;
  date: Date;
  lines: ReceiptLine[];
  total: string;
  paid: string;
  balance: string; // outstanding debt; '0.00' for a fully paid sale
}

/** `• iPhone 15 ×2 — $1 500.00` for one line; model escaped, price grouped like the client. */
function renderLine(line: ReceiptLine): string {
  return `• ${escapeHtml(line.model)} ×${line.quantity} — ${money(line.unitPrice)}`;
}

/** The totals block for one language, given its labels; shows the debt line only when owed. */
function renderTotals(data: ReceiptData, totalL: string, paidL: string, debtL: string): string[] {
  const rows = [`${totalL}: ${money(data.total)}`, `${paidL}: ${money(data.paid)}`];
  if (Number(data.balance) > 0) rows.push(`${debtL}: ${money(data.balance)}`);
  return rows;
}

/** Bilingual sale receipt: uz block then ru block, each with the items and totals. */
export function buildReceiptText(data: ReceiptData): string {
  const shop = escapeHtml(data.shopName);
  const items = data.lines.map(renderLine);
  const uz = [
    `<b>${shop}</b>`,
    `🧾 ${formatDate(data.date)}`,
    'Xaridingiz uchun rahmat!',
    ...items,
    ...renderTotals(data, 'Jami', "To'langan", 'Qarz'),
  ];
  const ru = [
    'Спасибо за покупку!',
    ...items,
    ...renderTotals(data, 'Итого', 'Оплачено', 'Долг'),
  ];
  return [...uz, '', ...ru].join('\n');
}

/** Bilingual weekly debt reminder for one customer's total outstanding amount. */
export function buildDebtReminderText(shopName: string, amount: string): string {
  const shop = escapeHtml(shopName);
  const amt = money(amount);
  return [
    `<b>${shop}</b>`,
    `Hurmatli mijoz, sizda ${amt} miqdorida qarz bor. Iltimos, to'lovni amalga oshiring.`,
    '',
    `Уважаемый клиент, за вами числится долг ${amt}. Пожалуйста, погасите задолженность.`,
  ].join('\n');
}

/** One device whose warranty is ending (name is free text → escaped at render time). */
export interface WarrantyItem {
  device: string;
  until: Date;
}

/**
 * Bilingual warranty-expiry reminder listing every expiring device for ONE customer, so a customer
 * with several devices expiring on the same run gets a single message, not one per device.
 */
export function buildWarrantyReminderText(shopName: string, items: WarrantyItem[]): string {
  const shop = escapeHtml(shopName);
  const rows = items.map((i) => `• ${escapeHtml(i.device)} — ${formatDate(i.until)}`);
  return [
    `<b>${shop}</b>`,
    'Quyidagi mahsulotlar kafolati tugayapti:',
    ...rows,
    '',
    'Истекает гарантия на следующие товары:',
    ...rows,
  ].join('\n');
}
