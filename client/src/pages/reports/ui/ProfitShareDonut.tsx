import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitGroup } from '@/entities/report';
import { ChartTooltip } from './chartKit';
import { CARD, CHART } from './chartPalette';
import { money } from './reportFormat';

interface ProfitShareDonutProps {
  title: string;
  groups: ProfitGroup[];
  /** Caption shown above the centred total (e.g. "Sales"). */
  centerCaption: string;
}

/** Slice colours — shared palette plus accents, enough for top groups + an "Other" bucket. */
const SLICES = [CHART.sales, CHART.profit, CHART.expense, CHART.share, '#0071e3', CHART.cost];

interface Slice {
  name: string;
  value: number;
}

/** Top 5 groups by sales plus an "Other" bucket for the remainder. */
function toSlices(groups: ProfitGroup[], accessories: string, other: string): Slice[] {
  const sorted = groups
    .map((g) => ({ name: g.name || accessories, value: Number(g.sales) || 0 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= 6) return sorted;
  return [...sorted.slice(0, 5), { name: other, value: sorted.slice(5).reduce((s, x) => s + x.value, 0) }];
}

/** Sales-share donut for any grouping (category, location, …) with the total in the centre. */
export function ProfitShareDonut({ title, groups, centerCaption }: ProfitShareDonutProps) {
  const { t } = useTranslation();
  const slices = toSlices(groups, t('reports.accessories'), t('reports.other'));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6')}>
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      {total === 0 ? (
        <p className="py-10 text-center text-[13px] text-steel">{t('reports.noGroupData')}</p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none">
                  {slices.map((s, i) => (
                    <Cell key={s.name} fill={SLICES[i % SLICES.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] text-steel">{centerCaption}</span>
              <span className="font-sf-pro-display text-base font-semibold tabular-nums tracking-[-0.02em] text-ink">
                {money(total)}
              </span>
            </div>
          </div>
          <ul className="flex-1 space-y-2 self-center">
            {slices.map((s, i) => (
              <li key={s.name} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2 text-slate">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SLICES[i % SLICES.length] }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-ink">{Math.round((s.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
