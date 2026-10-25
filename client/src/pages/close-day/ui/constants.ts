/** Shared style tokens and helpers for the close-day tiles (kept out of the .tsx for fast-refresh). */

/** Premium numerals: SF Pro Display, tabular, tight tracking — matches the reports dashboard. */
export const NUM = 'font-sf-pro-display tabular-nums tracking-[-0.02em] text-ink';

/** Card token shared by the close-day tiles (same hairline + radius as the report cards). */
export const CARD = 'rounded-[28px] border border-hairline-silver/70 bg-card text-card-foreground';


/** Column layout shared by the events feed header and every row, so they line up like a table. */
export const EVENT_GRID = 'grid grid-cols-[3rem_8.5rem_minmax(0,1fr)_7rem_6.5rem_7rem] items-center gap-3';
