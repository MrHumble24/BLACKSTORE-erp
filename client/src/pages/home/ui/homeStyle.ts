/** Falcon-blend home styling. Mirrors pages/reports/ui so the dashboard reads as one system. */

/** Soft-bordered card using theme tokens for automatic Light and Dark mode. */
export const CARD =
  'rounded-2xl border border-hairline-silver/70 bg-card text-card-foreground shadow-none';

/** Premium numerals: SF Pro Display, tabular, adapting to theme ink. */
export const NUM = 'font-sf-pro-display tabular-nums tracking-[-0.02em] text-ink';

/** Currency money formatter shared with the reports slice. */
export { money, CURRENCY } from '@/shared/lib';
