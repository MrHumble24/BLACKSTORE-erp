import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';

interface CustomerDebtCardProps {
  debt: string;
}

/** Card rendering aggregated debt for a customer. */
export function CustomerDebtCard({ debt }: CustomerDebtCardProps) {
  const { t } = useTranslation();
  const hasDebt = Number(debt) > 0;

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('customers.debt')}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col justify-center items-center py-6">
        <span className="text-xs text-slate">{t('customers.debt')}</span>
        <span
          className={`text-2xl font-bold font-mono tracking-tight mt-1 ${
            hasDebt ? 'text-launch-orange' : 'text-ink'
          }`}
        >
          {formatMoney(debt)}
        </span>
      </CardContent>
    </Card>
  );
}
