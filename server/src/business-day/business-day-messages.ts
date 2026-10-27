import { formatDate } from '../common/dates';
import { escapeHtml } from '../common/html';
import { money } from '../common/money';
import type { ClosedDay } from './business-day.mappers';

/** Format signed variance with + / - and $ prefix. */
export function formatVariance(v: string | null | undefined): string {
  if (!v) return '$0.00';
  const num = Number(v);
  if (num === 0) return '$0.00';
  const sign = num > 0 ? '+' : '-';
  return `${sign}${money(Math.abs(num).toString())}`;
}

/** Builds the instant alert HTML message sent to the owner on day close (Phase 1). */
export function buildDayCloseAlertText(day: ClosedDay, actorName: string, note?: string | null): string {
  const cashVar = Number(day.cashVariance ?? 0);
  const cardVar = Number(day.cardVariance ?? 0);
  const hasVariance = cashVar !== 0 || cardVar !== 0;

  const header = hasVariance
    ? `⚠️ <b>DIQQAT: Kassa yopilishida farq aniqlandi! (#${day.id})</b>`
    : `✅ <b>Kassa muvaffaqiyatli yopildi (#${day.id})</b>`;

  const closedDate = day.closedAt ? formatDate(day.closedAt) : formatDate(new Date());

  const lines = [
    header,
    `🗓 Sana: ${closedDate}`,
    `👤 Yopdi: <b>${escapeHtml(actorName)}</b>`,
    '',
    '💵 <b>Naqd pul:</b>',
    `• Kutilgan: ${money(day.expectedCash ? day.expectedCash.toString() : '0')}`,
    `• Sanalgan: ${money(day.countedCash ? day.countedCash.toString() : '0')}`,
    `• <b>Farq: ${formatVariance(day.cashVariance ? day.cashVariance.toString() : '0')}</b>${
      cashVar < 0 ? ' <i>(Kamomad)</i>' : cashVar > 0 ? ' <i>(Ortiqcha)</i>' : ' ✓'
    }`,
    '',
    '💳 <b>Karta / Terminal:</b>',
    `• Kutilgan: ${money(day.expectedCard ? day.expectedCard.toString() : '0')}`,
    `• Sanalgan: ${money(day.countedCard ? day.countedCard.toString() : '0')}`,
    `• <b>Farq: ${formatVariance(day.cardVariance ? day.cardVariance.toString() : '0')}</b>${
      cardVar !== 0 ? ' ⚠️' : ' ✓'
    }`,
  ];

  if (note && note.trim()) {
    lines.push('', `📝 <b>Izoh:</b> ${escapeHtml(note.trim())}`);
  }

  return lines.join('\n');
}
