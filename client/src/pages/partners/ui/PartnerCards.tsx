import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { PartnerReport } from '@/entities/partner';

interface PartnerCardsProps {
  partner: PartnerReport;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  highlight?: boolean;
  destructive?: boolean;
}

function MetricCard({ title, value, highlight, destructive }: MetricCardProps) {
  const textColor = destructive
    ? 'text-destructive'
    : highlight
      ? 'text-launch-orange'
      : 'text-ink';

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-2.5 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-xs font-medium text-slate">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex items-center justify-center">
        <span className={`text-2xl font-bold font-mono tracking-tight ${textColor}`}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

/** Four KPI cards displaying held items, sold unpaid, total owed and overdue count. */
export function PartnerCards({ partner }: PartnerCardsProps) {
  const { t } = useTranslation();
  const hasDebt = Number(partner.totalOwed) > 0;
  const hasOverdue = partner.overdue > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard title={t('partners.held')} value={partner.held} />
      <MetricCard title={t('partners.soldUnpaid')} value={partner.soldUnpaid} />
      <MetricCard
        title={t('partners.totalOwed')}
        value={formatMoney(partner.totalOwed)}
        highlight={hasDebt}
      />
      <MetricCard
        title={t('partners.overdue')}
        value={partner.overdue}
        destructive={hasOverdue}
      />
    </div>
  );
}
