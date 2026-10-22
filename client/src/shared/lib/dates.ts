/** Returns today's date formatted as YYYY-MM-DD using the local machine time
 * (toISOString would give the UTC date between 00:00 and 05:00 in +05 zones). */
export function getTodayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The YYYY-MM-DD part of an ISO date string, or "—" when empty (the one date formatter). */
export function formatDate(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '—';
}

/** Date plus HH:mm from an ISO string, or "—" when empty (for the audit log timeline). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
