/**
 * Formats a monetary amount string or number with thousands separator and two decimal places.
 * Does not include currency symbols per BLACKSTORE single-currency design rules.
 * Examples: "1500" -> "1 500.00", "0" -> "0.00", null -> "-"
 */
export function formatMoney(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }

  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) {
    return String(amount);
  }

  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') ?? '0';
  const decimalPart = parts[1] ?? '00';

  return `${integerPart}.${decimalPart}`;
}
