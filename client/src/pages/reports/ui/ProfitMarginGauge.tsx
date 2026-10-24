import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitTotals } from '@/entities/report';
import { CARD, CHART } from './chartPalette';
import { money } from './reportFormat';

interface ProfitMarginGaugeProps {
  totals: ProfitTotals;
  previous: ProfitTotals | null;
}

/** Gross margin % (profit ÷ sales), or null when sales are zero. */
function marginOf(t: ProfitTotals | null | undefined): number | null {
  if (!t) return null;
  const sales = Number(t.sales);
  return sales > 0 ? Math.round((Number(t.profit) / sales) * 1000) / 10 : null;
}

/** Half-circle gauge of gross margin, with the prior-period benchmark and net figure beneath. */
export function ProfitMarginGauge({ totals, previous }: ProfitMarginGaugeProps) {
  const { t } = useTranslation();
  const rounded = marginOf(totals) ?? 0;
  const prevMargin = marginOf(previous);
  // Arc fills 0–100%; a negative or >100 margin clamps, while the label shows the true value.
  const arc = Math.max(0, Math.min(100, rounded));
  const color = rounded >= 0 ? CHART.profit : CHART.expense;

  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6')}>
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.grossMargin')}</h3>
      <div className="relative mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ value: arc }]}
            innerRadius="74%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} fill={color} background={{ fill: CHART.track }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center">
          <span className="font-sf-pro-display text-3xl font-bold tabular-nums tracking-[-0.03em] text-ink">
            {rounded}%
          </span>
          <span className="text-[11px] text-steel">{t('reports.profit')}</span>
        </div>
      </div>
      {prevMargin != null && (
        <div className="-mt-2 mb-1 text-center text-[11px] text-steel tabular-nums">
          {t('reports.vsPrevious')} {prevMargin}%
        </div>
      )}
      <div className="mt-1 flex items-center justify-between border-t border-hairline-silver/40 pt-2 text-[13px]">
        <span className="text-slate">{t('reports.netProfit')}</span>
        <span className="font-semibold tabular-nums text-ink">{money(totals.netProfit)}</span>
      </div>
    </Card>
  );
}
