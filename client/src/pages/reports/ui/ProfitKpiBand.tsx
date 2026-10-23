import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitTotals, ProfitDailyTrend, ProfitSummary } from '@/entities/report';
import { DeltaBadge } from './chartKit';
import { CARD, CHART } from './chartPalette';
import { money } from './reportFormat';

/** Premium numerals: SF Pro Display, tabular, in Falcon navy. */
const NUM = 'font-sf-pro-display tabular-nums tracking-[-0.02em] text-[#344050]';

interface ProfitKpiBandProps {
  totals: ProfitTotals;
  previous: ProfitTotals | null;
  summary: ProfitSummary;
  dailyTrends?: ProfitDailyTrend[];
}

/** Percentage of `part` over `whole`, or null when it can't be computed. */
function margin(part: string, whole: string): string | null {
  const w = Number(whole);
  if (!w) return null;
  return `${((Number(part) / w) * 100).toFixed(1)}%`;
}

/** Soft blue Falcon-style area trace of the net-profit trajectory (no axes). */
function AreaSpark({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="mt-4 -mb-2 h-20" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.sales} stopOpacity={0.2} />
              <stop offset="100%" stopColor={CHART.sales} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area type="monotone" dataKey="value" stroke={CHART.sales} strokeWidth={2.5} fill="url(#netArea)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Net-profit highlight: the headline figure, net margin, period delta and a trajectory trace. */
function NetProfitHighlight({ totals, previous, dailyTrends }: Pick<ProfitKpiBandProps, 'totals' | 'previous' | 'dailyTrends'>) {
  const { t } = useTranslation();
  const netMargin = margin(totals.netProfit, totals.sales);
  const sparks = (dailyTrends ?? []).map((d) => Number(d.profit) || 0);

  return (
    <Card className={cn(CARD, 'flex flex-col overflow-hidden p-5 sm:p-6 lg:col-span-5')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[#5e6e82]">{t('reports.netProfit')}</span>
        {netMargin && (
          <span className="rounded-full bg-[#2c7be5]/10 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-[#2c7be5]">
            {t('reports.netMargin')} {netMargin}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2.5">
        <p className={cn('text-[2.1rem] font-bold sm:text-4xl', NUM)}>{money(totals.netProfit)}</p>
        <DeltaBadge current={totals.netProfit} previous={previous?.netProfit} variant="plain" className="mb-1.5" />
      </div>
      {sparks.length > 1 ? <AreaSpark values={sparks} /> : <div className="flex-1" />}
    </Card>
  );
}

/** Tiny inline trend trace used inside a stat cell. */
function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="mt-2 h-7" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} fill={`url(#spark-${color})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  previous?: string | null;
  goodDirection?: 'up' | 'down';
  note?: string | null;
  spark?: number[];
  sparkColor?: string;
  /** Pre-formatted display (e.g. a count or percent) shown instead of money(value). */
  valueText?: string;
}

/** One stat cell: label, figure, the prior-period value with an inline delta, and an optional spark. */
function Stat({ label, value, previous, goodDirection, note, spark, sparkColor, valueText }: StatProps) {
  const hasPrev = previous != null && Number(previous) !== 0;
  return (
    <div className="flex flex-col px-5 py-4">
      <p className="text-[12px] font-medium text-[#5e6e82]">{label}</p>
      <p className={cn('mt-1.5 text-[1.4rem] font-semibold', NUM)}>{valueText ?? money(value)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#9da9bb]">
        {note ? <span className="tabular-nums">{note}</span> : hasPrev ? <span className="tabular-nums">{money(previous)}</span> : null}
        <DeltaBadge current={value} previous={previous} goodDirection={goodDirection} variant="plain" />
      </p>
      {spark && spark.length > 1 && <MiniSpark values={spark} color={sparkColor ?? CHART.sales} />}
    </div>
  );
}

/** Multi-stat card: the supporting figures in a divided grid, each with a prior-period delta. */
function StatGrid({ totals, previous, dailyTrends, summary }: ProfitKpiBandProps) {
  const { t } = useTranslation();
  const grossMargin = margin(totals.profit, totals.sales);
  const trends = dailyTrends ?? [];
  const salesSpark = trends.map((d) => Number(d.sales) || 0);
  const profitSpark = trends.map((d) => Number(d.profit) || 0);
  const returnRate = summary.transactions > 0 ? ((summary.returnCount / summary.transactions) * 100).toFixed(1) : '0';

  return (
    <Card className={cn(CARD, 'overflow-hidden lg:col-span-7')}>
      <div className="grid grid-cols-2 divide-x divide-y divide-[#edf2f9] sm:grid-cols-3">
        <Stat label={t('reports.sales')} value={totals.sales} previous={previous?.sales} spark={salesSpark} sparkColor={CHART.sales} />
        <Stat label={t('reports.profit')} value={totals.profit} previous={previous?.profit} note={grossMargin ? `${t('reports.margin')} ${grossMargin}` : null} spark={profitSpark} sparkColor={CHART.profit} />
        <Stat label={t('reports.expenses')} value={totals.expenses} previous={previous?.expenses} goodDirection="down" />
        <Stat label={t('reports.transactions')} value="" valueText={String(summary.transactions)} />
        <Stat label={t('reports.unitsSold')} value="" valueText={String(summary.unitsSold)} />
        <Stat label={t('reports.returnRate')} value="" valueText={`${returnRate}%`} />
      </div>
    </Card>
  );
}

/** Top overview: net-profit highlight beside the supporting stat grid. */
export function ProfitKpiBand(props: ProfitKpiBandProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <NetProfitHighlight totals={props.totals} previous={props.previous} dailyTrends={props.dailyTrends} />
      <StatGrid {...props} />
    </div>
  );
}
