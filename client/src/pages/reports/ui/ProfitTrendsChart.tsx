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
import { formatMoney } from '@/shared/lib';
import type { ProfitDailyTrend } from '@/entities/report';

interface ProfitTrendsChartProps {
  dailyTrends?: ProfitDailyTrend[];
  canViewCost: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

/** Restrained chart palette: blue = sales (identity), emerald = profit, neutral dashed = cost. */
const SERIES = {
  sales: { stroke: '#0066cc', gradientId: 'trendSalesGrad' },
  cost: { stroke: '#98a2af' },
  profit: { stroke: '#059669' },
} as const;

function formatDateLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return isoDate;
}

/** Short Y-axis money labels: 0, 2.5k, 10k. */
function compactAxisMoney(value: number): string {
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    const rounded = Math.round(thousands * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
  }
  return String(value);
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
    <div className="rounded-2xl border border-hairline-silver/80 bg-gallery-white/95 px-3.5 py-3 shadow-lg backdrop-blur-md">
      <p className="mb-2 text-[11px] font-semibold text-steel">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-slate">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-ink">{formatMoney(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sales/cost/profit daily progression: filled sales area + profit line + dashed cost line. */
function TrendChart({
  data,
  showCost,
  nameFor,
}: {
  data: Array<Record<string, number | string>>;
  showCost: boolean;
  nameFor: { sales: string; cost: string; profit: string };
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={SERIES.sales.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0066cc" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#0066cc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eef0f3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
          tick={{ fontSize: 11, fill: '#8e9094' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11, fill: '#8e9094' }}
          tickFormatter={compactAxisMoney}
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
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const EMPTY_TRENDS: ProfitDailyTrend[] = [];

/** Daily revenue and profit trend card with inline legend and cost toggle. */
export function ProfitTrendsChart({ dailyTrends = EMPTY_TRENDS, canViewCost }: ProfitTrendsChartProps) {
  const { t } = useTranslation();
  const [showCost, setShowCost] = useState(canViewCost);

  const chartData = dailyTrends.map((d) => ({
    date: formatDateLabel(d.date),
    sales: Number(d.sales) || 0,
    profit: Number(d.profit) || 0,
    ...(canViewCost ? { cost: Number(d.cost ?? 0) || 0 } : {}),
  }));

  if (chartData.length === 0) return null;

  const legendItems = [
    { label: t('reports.sales'), color: SERIES.sales.stroke },
    ...(canViewCost && showCost ? [{ label: t('reports.cost'), color: SERIES.cost.stroke, dashed: true }] : []),
    { label: t('reports.profit'), color: SERIES.profit.stroke },
  ];
  const nameFor = { sales: t('reports.sales'), cost: t('reports.cost'), profit: t('reports.profit') };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-col justify-between gap-3 p-5 pb-0 sm:flex-row sm:items-center sm:p-6 sm:pb-0">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {t('reports.trendsTitle', 'Revenue & Profit Trends')}
          </h3>
          <p className="mt-0.5 text-xs text-steel">
            {t('reports.trendsSubtitle', 'Daily sales and gross margin progression')}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <TrendChart data={chartData} showCost={Boolean(canViewCost && showCost)} nameFor={nameFor} />
        </div>
      </CardContent>
    </Card>
  );
}
