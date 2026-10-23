import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitGroup } from '@/entities/report';
import { ChartTooltip } from './chartKit';
import { CARD, CHART } from './chartPalette';
import { compactMoney } from './reportFormat';

interface ProfitRankChartProps {
  title: string;
  groups: ProfitGroup[];
  /** How many rows to show; the rest are dropped (lists can be long). */
  limit?: number;
}

/** Trims a long category/model name so it fits the axis gutter. */
function clip(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

/** Dot + label legend shown in the card header. */
function Legend({ sales, profit }: { sales: string; profit: string }) {
  return (
    <div className="flex items-center gap-4 text-[11px] font-medium text-steel">
      <span className="flex items-center gap-1.5">
        <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: CHART.sales }} />
        {sales}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: CHART.profit }} />
        {profit}
      </span>
    </div>
  );
}

/** Ranked horizontal bars comparing sales and gross profit per group (category or product model). */
export function ProfitRankChart({ title, groups, limit = 7 }: ProfitRankChartProps) {
  const { t } = useTranslation();

  const rows = groups
    .map((g) => ({
      name: g.name || t('reports.accessories'),
      sales: Number(g.sales) || 0,
      profit: Number(g.profit) || 0,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);

  const height = Math.max(180, rows.length * 46);

  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6')}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <Legend sales={t('reports.sales')} profit={t('reports.profit')} />
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-steel">{t('reports.noGroupData')}</p>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap={12}>
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" tickFormatter={compactMoney} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHART.axis }} />
              <YAxis
                type="category"
                dataKey="name"
                width={104}
                tickLine={false}
                axisLine={false}
                tickFormatter={clip}
                tick={{ fontSize: 12, fill: CHART.ink }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="sales" name={t('reports.sales')} fill={CHART.sales} radius={[0, 5, 5, 0]} barSize={9} isAnimationActive={false} background={{ fill: CHART.track, radius: 5 }} />
              <Bar dataKey="profit" name={t('reports.profit')} fill={CHART.profit} radius={[0, 5, 5, 0]} barSize={9} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
