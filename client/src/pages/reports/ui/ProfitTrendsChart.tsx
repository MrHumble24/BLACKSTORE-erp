import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardContent } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitDailyTrend } from '@/entities/report';
import { TooltipShell } from './chartKit';
import { CARD, CHART } from './chartPalette';
import { compactMoney, money } from './reportFormat';

interface ProfitTrendsChartProps {
  dailyTrends?: ProfitDailyTrend[];
  previousTrends?: ProfitDailyTrend[];
  canViewCost: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

/** Series strokes drawn from the shared palette so this chart matches the rest of the report. */
const SERIES = {
  sales: { stroke: CHART.sales, gradientId: 'trendSalesGrad' },
  cost: { stroke: CHART.cost },
  profit: { stroke: CHART.profit },
} as const;

/** Faint tint of the sales blue for the previous-period comparison line. */
const PREV_SALES = '#9dc3f0';

function formatDateLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return isoDate;
}

/** Compact inline legend: dot + label pairs shown in the card header. */
function ChartLegend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] font-medium text-steel">
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={
              item.dashed
                ? { border: `2px solid ${item.color}`, backgroundColor: 'transparent' }
                : { backgroundColor: item.color }
            }
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** Hover tooltip: hairline card with dot markers and tabular money values. */
function TrendTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <TooltipShell>
      <p className="mb-2 text-[11px] font-semibold text-steel">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-slate">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-ink">{money(entry.value)}</span>
          </div>
        ))}
      </div>
    </TooltipShell>
  );
}

/** Sales/cost/profit daily progression: filled sales area + profit line + dashed cost line. */
function TrendChart({
  data,
  showCost,
  showPrev,
  nameFor,
}: {
  data: Array<Record<string, number | string>>;
  showCost: boolean;
  showPrev: boolean;
  nameFor: { sales: string; cost: string; profit: string; cumulative: string; prev: string };
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={SERIES.sales.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.sales} stopOpacity={0.16} />
            <stop offset="100%" stopColor={CHART.sales} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
          tick={{ fontSize: 11, fill: CHART.axis }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fontSize: 11, fill: CHART.axis }}
          tickFormatter={compactMoney}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fontSize: 11, fill: CHART.axis }}
          tickFormatter={compactMoney}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#d6d6d6', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="sales"
          name={nameFor.sales}
          stroke={SERIES.sales.stroke}
          strokeWidth={2}
          fill={`url(#${SERIES.sales.gradientId})`}
          fillOpacity={1}
          dot={false}
          activeDot={{ r: 4, fill: '#ffffff', stroke: SERIES.sales.stroke, strokeWidth: 2 }}
        />
        {showPrev && (
          <Line
            type="monotone"
            dataKey="prevSales"
            name={nameFor.prev}
            stroke={PREV_SALES}
            strokeWidth={1.75}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, fill: '#ffffff', stroke: PREV_SALES, strokeWidth: 2 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="profit"
          name={nameFor.profit}
          stroke={SERIES.profit.stroke}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#ffffff', stroke: SERIES.profit.stroke, strokeWidth: 2 }}
        />
        {showCost && (
          <Line
            type="monotone"
            dataKey="cost"
            name={nameFor.cost}
            stroke={SERIES.cost.stroke}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4, fill: '#ffffff', stroke: SERIES.cost.stroke, strokeWidth: 2 }}
          />
        )}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulative"
          name={nameFor.cumulative}
          stroke={CHART.share}
          strokeWidth={2}
          strokeDasharray="2 3"
          dot={false}
          activeDot={{ r: 4, fill: '#ffffff', stroke: CHART.share, strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const EMPTY_TRENDS: ProfitDailyTrend[] = [];

/** Daily revenue and profit trend card with inline legend and cost toggle. */
export function ProfitTrendsChart({
  dailyTrends = EMPTY_TRENDS,
  previousTrends = EMPTY_TRENDS,
  canViewCost,
}: ProfitTrendsChartProps) {
  const { t } = useTranslation();
  const [showCost, setShowCost] = useState(canViewCost);
  const showPrev = previousTrends.length > 0;

  const chartData = dailyTrends.map((d, i, arr) => ({
    date: formatDateLabel(d.date),
    sales: Number(d.sales) || 0,
    profit: Number(d.profit) || 0,
    // Running profit total up to this day (n is a day count, so the inner sum is cheap).
    cumulative: arr.slice(0, i + 1).reduce((sum, x) => sum + (Number(x.profit) || 0), 0),
    ...(showPrev ? { prevSales: Number(previousTrends[i]?.sales) || 0 } : {}),
    ...(canViewCost ? { cost: Number(d.cost ?? 0) || 0 } : {}),
  }));

  if (chartData.length === 0) return null;

  const legendItems = [
    { label: t('reports.sales'), color: SERIES.sales.stroke },
    ...(showPrev ? [{ label: t('reports.prevPeriod'), color: PREV_SALES, dashed: true }] : []),
    ...(canViewCost && showCost ? [{ label: t('reports.cost'), color: SERIES.cost.stroke, dashed: true }] : []),
    { label: t('reports.profit'), color: SERIES.profit.stroke },
    { label: t('reports.cumulative'), color: CHART.share, dashed: true },
  ];
  const nameFor = {
    sales: t('reports.sales'),
    cost: t('reports.cost'),
    profit: t('reports.profit'),
    cumulative: t('reports.cumulative'),
    prev: t('reports.prevPeriod'),
  };

  return (
    <Card className={cn(CARD, 'flex h-full flex-col overflow-hidden')}>
      <div className="flex flex-col justify-between gap-3 p-5 pb-0 sm:flex-row sm:items-center sm:p-6 sm:pb-0">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {t('reports.trendsTitle', 'Revenue & Profit Trends')}
          </h3>
          <p className="mt-0.5 text-xs text-steel">
            {t('reports.trendsSubtitle', 'Daily sales and gross margin progression')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ChartLegend items={legendItems} />
          {canViewCost && (
            <button
              type="button"
              onClick={() => setShowCost((prev) => !prev)}
              aria-pressed={showCost}
              className="cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium text-slate transition-colors hover:bg-studio-mist hover:text-ink"
            >
              {showCost ? t('reports.hideCost', 'Hide Cost') : t('reports.showCost', 'Show Cost')}
            </button>
          )}
        </div>
      </div>
      <CardContent className="h-72 p-5 pt-4 sm:p-6 sm:pt-4">
        <div className="h-full w-full">
          <TrendChart data={chartData} showCost={Boolean(canViewCost && showCost)} showPrev={showPrev} nameFor={nameFor} />
        </div>
      </CardContent>
    </Card>
  );
}
