import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { ProfitTotals } from '@/entities/report';

interface ProfitReportTotalsCardsProps {
  totals: ProfitTotals;
  canViewCost: boolean;
}

interface MetricProps {
  title: string;
  value: string;
  highlight?: boolean;
}

function Metric({ title, value, highlight }: MetricProps) {
  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-2.5 px-3 border-b border-hairline-silver/60">
        <CardTitle className="text-[11px] font-medium text-slate truncate">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex items-center justify-center">
        <span
          className={`font-mono text-sm sm:text-base font-bold tracking-tight ${
            highlight ? 'text-launch-orange' : 'text-ink'
          }`}
        >
          {formatMoney(value)}
        </span>
      </CardContent>
    </Card>
  );
}

/** KPI totals cards for sales, refunds, profit, investor share, expenses and net profit. */
export function ProfitReportTotalsCards({
  totals,
  canViewCost,
}: ProfitReportTotalsCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Metric title={t('reports.sales')} value={totals.sales} />
      <Metric title={t('reports.refunded')} value={totals.refunded} />
      {canViewCost && <Metric title={t('reports.cost')} value={totals.cost} />}
      <Metric title={t('reports.profit')} value={totals.profit} />
      <Metric title={t('reports.investorShare')} value={totals.investorShare} />
      <Metric title={t('reports.businessShare')} value={totals.businessShare} />
      <Metric title={t('reports.expenses')} value={totals.expenses} />
      <Metric title={t('reports.otherIncome')} value={totals.otherIncome} />
      <Metric title={t('reports.netProfit')} value={totals.netProfit} highlight />
    </div>
  );
}
