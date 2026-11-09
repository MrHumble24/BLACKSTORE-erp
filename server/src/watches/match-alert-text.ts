import { escapeHtml } from '../common/html';

/** The match fields the owner alert shows (strings as stored/returned). */
export interface MatchAlertInput {
  price: string | null;
  currency: string | null;
  condition: string | null;
  confidence: string;
  sellerName: string | null;
  sellerUsername: string | null;
  messageText: string;
  messageLink: string | null;
  groupTitle: string;
  parentText: string | null;
}

/**
 * Cuts `s` to `max` characters with an ellipsis, so one long post cannot flood the alert. Counts
 * code points (Array.from) so an emoji is never split into a broken surrogate half.
 */
function clamp(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : `${chars.slice(0, max).join('')}…`;
}

/**
 * Owner Telegram alert for a new Watcher match (F34), in Telegram HTML. Every user-supplied value
 * is escaped: seller texts come from public groups.
 */
export function buildMatchAlertText(match: MatchAlertInput, watchName: string): string {
  const seller = [match.sellerName, match.sellerUsername ? `@${match.sellerUsername}` : null]
    .filter(Boolean)
    .join(' ');
  const details = [
    match.price ? `${match.price} ${match.currency ?? ''}`.trim() : null,
    match.condition,
    `${Math.round(Number(match.confidence) * 100)}%`,
  ].filter(Boolean);
  const lines = [
    `🔔 <b>${escapeHtml(watchName)}</b>`,
    escapeHtml([match.groupTitle, seller].filter(Boolean).join(' · ')),
    `💵 ${escapeHtml(details.join(' · '))}`,
    escapeHtml(clamp(match.messageText, 300)),
    match.parentText ? `↩ ${escapeHtml(clamp(match.parentText, 80))}` : null,
    match.messageLink ? escapeHtml(match.messageLink) : null,
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}
