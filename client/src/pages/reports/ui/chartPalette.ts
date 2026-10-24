/** Blended palette (Apple base + Falcon dashboard accents) so every report chart reads as one system. */

export const CHART = {
  /** Sales / volume — theme dynamic blue. */
  sales: 'var(--pricing-blue)',
  /** Profit / positive — emerald. */
  profit: '#10b981',
  /** Cost — muted blue-grey. */
  cost: '#94a3b8',
  /** Expenses / money out — theme dynamic orange/coral. */
  expense: 'var(--launch-orange)',
  /** Other income / money in — emerald. */
  income: '#10b981',
  /** Share — violet accent. */
  share: '#8b5cf6',
  /** Net / headline — Apple ink. */
  ink: 'var(--ink)',
  /** Light "track" bars behind value bars (Falcon idea, adapting to theme). */
  track: 'var(--control-gray)',
  /** Grid lines. */
  grid: 'var(--hairline-silver)',
  /** Axis tick labels. */
  axis: 'var(--slate)',
} as const;

/** Headline-number ink (Apple). */
export const INK = 'var(--ink)';
/** Muted label grey (Apple steel). */
export const MUTED = 'var(--steel)';

/** Card container using theme tokens for automatic Light and Dark mode. */
export const CARD =
  'rounded-2xl border border-hairline-silver/70 bg-card text-card-foreground shadow-none';
