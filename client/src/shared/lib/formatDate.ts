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
    ? date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : date.toLocaleDateString('ru-RU');
}


/** Date plus time (for the audit log timeline). */
export const formatDateTime = (value: string | Date | null | undefined) => formatDate(value, true);
