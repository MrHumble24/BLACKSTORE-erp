import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Card } from '@/shared/ui';
import { cn, formatMoney } from '@/shared/lib';
import type { ProfitTotals, ProfitDailyTrend } from '@/entities/report';

interface ProfitReportTotalsCardsProps {
  totals: ProfitTotals;
  dailyTrends?: ProfitDailyTrend[];
  canViewCost: boolean;
}

type MetricTone = 'neutral' | 'positive' | 'negative';

const TONE_CLASSES: Record<MetricTone, string> = {
  neutral: 'text-ink',
  positive: 'text-emerald-600',
  negative: 'text-destructive',
};

/** Neutral tone when an amount is zero so zeros don't scream red/green. */
function toneWhenActive(value: string, activeTone: MetricTone): MetricTone {
  return Number(value) === 0 ? 'neutral' : activeTone;
}

function calculateMargin(numerator: string, denominator: string): string | null {
  const num = Number(numerator);
  const den = Number(denominator);
  if (!den || Number.isNaN(num) || Number.isNaN(den)) return null;
  return `${((num / den) * 100).toFixed(1)}%`;
}

/** One hairline label + amount row of the earnings statement (tabular numerals). */
function MetricRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: MetricTone;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline-silver/40 py-2.5 last:border-b-0 last:pb-0">
      <span className="text-[13px] text-slate">{label}</span>
      <span className={cn('text-[15px] font-semibold tabular-nums tracking-[-0.01em]', TONE_CLASSES[tone])}>
        {formatMoney(value)}
      </span>
    </div>
  );
}

function MetricGroup({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="p-5 sm:p-6">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** Miniature net-profit trajectory drawn on the dark hero tile (no axes, no tooltip). */
function ProfitSparkline({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="mt-5 h-12" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netProfitSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ffffff"
            strokeOpacity={0.65}
            strokeWidth={2}
            fill="url(#netProfitSpark)"
            fillOpacity={1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Dark accent tile: net profit headline, margin pill and profit sparkline. */
function NetProfitHero({
  totals,
  dailyTrends,
}: {
  totals: ProfitTotals;
  dailyTrends?: ProfitDailyTrend[];
}) {
  const { t } = useTranslation();
  const netMargin = calculateMargin(totals.netProfit, totals.sales);
  const sparkValues = (dailyTrends ?? []).map((trend) => Number(trend.profit) || 0);

  return (
    <div className="flex flex-col rounded-[28px] bg-ink p-5 text-gallery-white sm:col-span-2 sm:p-6 lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-gallery-white/60">{t('reports.netProfit')}</span>
        {netMargin && (
          <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 tabular-nums">
            {t('reports.netMargin', 'Net margin')}: {netMargin}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums sm:text-4xl">
        {formatMoney(totals.netProfit)}
      </p>
      {sparkValues.length > 1 ? (
        <ProfitSparkline values={sparkValues} />
      ) : (
        <div className="flex-1" />
      )}
      <p className="mt-auto pt-3 text-xs text-gallery-white/50">
        {t('reports.afterDeductions', 'After investor shares and operating expenses')}
      </p>
    </div>
  );
}

/** Small emerald margin pill (built imperatively to reuse the translated label). */
function buildGrossMarginBadge(t: ReturnType<typeof useTranslation>['t'], margin: string | null) {
  if (!margin) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 tabular-nums">
      {t('reports.margin', 'Margin')} {margin}
    </span>
  );
}

/** Quiet statement card: trading metrics next to share/overhead metrics. */
function ProfitStatement({
  totals,
  grossMargin,
  canViewCost,
}: {
  totals: ProfitTotals;
  grossMargin: string | null;
  canViewCost: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden sm:col-span-2 lg:col-span-3">
      <div className="grid grid-cols-1 divide-y divide-hairline-silver/60 md:grid-cols-2 md:divide-x md:divide-y-0">
        <MetricGroup title={t('reports.coreTrading', 'Trading Performance')} badge={buildGrossMarginBadge(t, grossMargin)}>
          <MetricRow label={t('reports.sales')} value={totals.sales} />
          <MetricRow label={t('reports.profit')} value={totals.profit} tone="positive" />
          {canViewCost && <MetricRow label={t('reports.cost')} value={totals.cost} />}
          <MetricRow
            label={t('reports.refunded')}
            value={totals.refunded}
            tone={toneWhenActive(totals.refunded, 'negative')}
          />
        </MetricGroup>
        <MetricGroup title={t('reports.adjustments', 'Shares & Operations')}>
          <MetricRow label={t('reports.investorShare')} value={totals.investorShare} />
          <MetricRow label={t('reports.businessShare')} value={totals.businessShare} />
          <MetricRow
            label={t('reports.expenses')}
            value={totals.expenses}
            tone={toneWhenActive(totals.expenses, 'negative')}
          />
          <MetricRow
            label={t('reports.otherIncome')}
            value={totals.otherIncome}
            tone={toneWhenActive(totals.otherIncome, 'positive')}
          />
        </MetricGroup>
      </div>
    </Card>
  );
}

/** Financial summary row: net profit hero plus the earnings statement. */
export function ProfitReportTotalsCards({ totals, dailyTrends, canViewCost }: ProfitReportTotalsCardsProps) {
  const grossMargin = calculateMargin(totals.profit, totals.sales);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <NetProfitHero totals={totals} dailyTrends={dailyTrends} />
      <ProfitStatement totals={totals} grossMargin={grossMargin} canViewCost={canViewCost} />
    </div>
  );
}
