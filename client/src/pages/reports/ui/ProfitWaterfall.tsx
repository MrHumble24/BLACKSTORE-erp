import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitTotals } from '@/entities/report';
import { TooltipShell } from './chartKit';
import { CARD, CHART } from './chartPalette';
import { compactMoney, money } from './reportFormat';

interface ProfitWaterfallProps {
  totals: ProfitTotals;
}

interface Step {
  name: string;
  /** Floating bar span [low, high]; recharts draws the bar between the two. */
  range: [number, number];
  signed: number;
  fill: string;
  total?: boolean;
}

/** One waterfall bar spanning [from, to]; colour reflects whether it adds or removes. */
function step(name: string, from: number, to: number, kind: 'total' | 'up' | 'down'): Step {
  const fill = kind === 'total' ? CHART.ink : kind === 'up' ? CHART.income : CHART.expense;
  return { name, range: [Math.min(from, to), Math.max(from, to)], signed: to - from, fill, total: kind === 'total' };
}

/**
 * Steps that build net profit, reconciling to the backend identity
 * `netProfit = grossProfit − expenses + otherIncome` (investor share is NOT a deduction here).
 */
function buildSteps(totals: ProfitTotals, labels: Record<string, string>): Step[] {
  const gross = Number(totals.profit);
  const expenses = Number(totals.expenses);
  const income = Number(totals.otherIncome);
  const afterExpenses = gross - expenses;
  const net = afterExpenses + income; // === Number(totals.netProfit)
  return [
    step(labels.gross, 0, gross, 'total'),
    step(labels.expenses, gross, afterExpenses, 'down'),
    step(labels.income, afterExpenses, net, 'up'),
    step(labels.net, 0, net, 'total'),
  ];
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: Step }>;
}

/** Hover card showing the step's signed contribution. */
function WaterfallTooltip({ active, payload }: TipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  const sign = datum.total || datum.signed >= 0 ? '' : '−';
  return (
    <TooltipShell>
      <p className="text-[11px] font-semibold text-steel">{datum.name}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
        {sign}
        {money(Math.abs(datum.signed))}
      </p>
    </TooltipShell>
  );
}

/** Net-profit waterfall: gross profit, less expenses, plus other income, equals net profit. */
export function ProfitWaterfall({ totals }: ProfitWaterfallProps) {
  const { t } = useTranslation();
  const steps = buildSteps(totals, {
    gross: t('reports.profit'),
    expenses: t('reports.expenses'),
    income: t('reports.otherIncome'),
    net: t('reports.netProfit'),
  });
  // Include any negative floor so a loss period (expenses > gross, or net < 0) isn't clipped at 0.
  const floor = Math.min(0, ...steps.map((s) => s.range[0]));

  return (
    <Card className={cn(CARD, 'flex h-full flex-col overflow-hidden')}>
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.profitComposition')}</h3>
        <p className="mt-0.5 text-xs text-steel">{t('reports.compositionSubtitle')}</p>
      </div>
      <CardContent className="h-72 p-5 pt-4 sm:p-6 sm:pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={steps} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: CHART.axis }}
              interval={0}
            />
            <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: CHART.axis }} tickFormatter={compactMoney} domain={[floor, 'dataMax']} />
            <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="range" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {steps.map((s) => (
                <Cell key={s.name} fill={s.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
