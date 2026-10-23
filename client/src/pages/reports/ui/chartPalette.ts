/** Blended palette (Apple base + Falcon dashboard accents) so every report chart reads as one system. */

export const CHART = {
  /** Sales / volume — Apple blue. */
  sales: '#0066cc',
  /** Profit / positive — emerald. */
  profit: '#059669',
  /** Cost — muted blue-grey. */
  cost: '#b6c1d2',
  /** Expenses / money out — Apple launch-orange. */
  expense: '#b64400',
  /** Other income / money in — emerald. */
  income: '#059669',
  /** Share — violet accent. */
  share: '#8b5cf6',
  /** Net / headline — Apple ink. */
  ink: '#1d1d1f',
  /** Light "track" bars behind value bars (Falcon idea, Apple-light tone). */
  track: '#f0f1f4',
  /** Grid lines. */
  grid: '#eef0f3',
  /** Axis tick labels. */
  axis: '#8e9094',
} as const;

/** Headline-number ink (Apple). */
export const INK = '#1d1d1f';
/** Muted label grey (Apple steel). */
export const MUTED = '#86868b';

/** Soft-shadowed white card: Falcon's depth, Apple's medium radius and restraint (overrides the app Card via twMerge). */
export const CARD =
  'rounded-2xl border-0 bg-white shadow-[0_4px_16px_0_rgba(29,29,31,0.06),0_1px_4px_0_rgba(29,29,31,0.04)]';
