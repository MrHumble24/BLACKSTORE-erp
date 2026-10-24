/** Falcon-blend home styling. Mirrors pages/reports/ui so the dashboard reads as one system. */

/** Soft-shadowed white card, matching the profit report CARD. */
export const CARD =
  'rounded-2xl border-0 bg-white shadow-[0_4px_16px_0_rgba(29,29,31,0.06),0_1px_4px_0_rgba(29,29,31,0.04)]';

/** Premium numerals: SF Pro Display, tabular, in Falcon navy. */
export const NUM = 'font-sf-pro-display tabular-nums tracking-[-0.02em] text-[#344050]';

/** Currency money formatter shared with the reports slice. */
export { money, CURRENCY } from '@/shared/lib';
