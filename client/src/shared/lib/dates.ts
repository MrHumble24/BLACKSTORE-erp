/** Returns today's date formatted as YYYY-MM-DD using the local machine time
 * (toISOString would give the UTC date between 00:00 and 05:00 in +05 zones). */
export function getTodayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
