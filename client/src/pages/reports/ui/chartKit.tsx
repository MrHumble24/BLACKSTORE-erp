import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib';
import { CHART } from './chartPalette';
import { money } from './reportFormat';

/** Shared chart components for the profit report: one hover card, one period-delta pill. */

/** The hairline floating card every chart tooltip sits in — one place so they all match. */
export function TooltipShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline-silver/80 bg-gallery-white/95 px-3.5 py-3 shadow-lg backdrop-blur-md">
      {children}
    </div>
  );
}

interface TooltipRow {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: ReactNode;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  /** Override the rows (e.g. to add quantity); defaults to one row per series. */
  rows?: TooltipRow[];
}

/** Hairline floating card used by every chart hover — dot + name on the left, money on the right. */
export function ChartTooltip({ active, label, payload, rows }: ChartTooltipProps) {
  if (!active || (!payload?.length && !rows?.length)) return null;
  const lines =
    rows ?? (payload ?? []).map((p) => ({ name: p.name ?? '', value: Number(p.value) || 0, color: p.color ?? CHART.ink }));

  return (
    <TooltipShell>
      {label != null && <p className="mb-2 text-[11px] font-semibold text-steel">{label}</p>}
      <div className="space-y-1.5">
        {lines.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-slate">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
              {row.name}
            </span>
            <span className="font-medium tabular-nums text-ink">{money(row.value)}</span>
          </div>
        ))}
      </div>
    </TooltipShell>
  );
}

interface DeltaBadgeProps {
  current: string;
  previous?: string | null;
  /** Which direction is "good": profit/sales rising is good; expenses rising is bad. */
  goodDirection?: 'up' | 'down';
  /** 'pill' = filled badge (on dark/hero); 'plain' = bare coloured text + arrow (Falcon stats). */
  variant?: 'pill' | 'plain';
  className?: string;
}

/** Period-over-period change (▲ 18%), green when the move is good, red when bad. */
export function DeltaBadge({ current, previous, goodDirection = 'up', variant = 'pill', className }: DeltaBadgeProps) {
  if (previous == null) return null;
  const prev = Number(previous);
  const curr = Number(current);
  if (!Number.isFinite(prev) || prev === 0) return null;

  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return null;

  const up = rounded > 0;
  const good = up === (goodDirection === 'up');
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const tone = good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  if (variant === 'plain') {
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums', tone, className)}>
        <Icon className="h-3 w-3" />
        {Math.abs(rounded)}%
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        good ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-destructive',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(rounded)}%
    </span>
  );
}
