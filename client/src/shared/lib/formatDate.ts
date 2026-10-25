import i18n from '@/shared/i18n';

/** Browser locale for dates: English uses en-GB; Uzbek and Russian keep ru-RU as today. */
function dateLocale(): string {
  return i18n.language === 'en' ? 'en-GB' : 'ru-RU';
}

/**
 * Formats an ISO date/time string into a localized display date.
 * Returns '—' for missing or invalid dates.
 */
export function formatDate(
  value: string | Date | null | undefined,
  includeTime = false,
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  return includeTime
    ? date.toLocaleString(dateLocale(), { dateStyle: 'short', timeStyle: 'short' })
    : date.toLocaleDateString(dateLocale());
}


/** Date plus time (for the audit log timeline). */
export const formatDateTime = (value: string | Date | null | undefined) => formatDate(value, true);

/** Hours and minutes only, in the app language (same locale as formatDate). Returns '—' when missing. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
}
