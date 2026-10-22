import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib';
import type { Sale } from '@/entities/sale';

interface SaleMetricsProps {
  sale: Sale;
}

/** 4-card metric strip showing total, paid, refunds and outstanding debt balance. */
export function SaleMetrics({ sale }: SaleMetricsProps) {
  const { t } = useTranslation();
  const isDebt = Number(sale.balance) > 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
        <div className="text-xs text-slate">{t('sales.total')}</div>
        <div className="text-lg font-bold text-ink mt-0.5">{formatMoney(sale.total)}</div>
      </div>
      <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
        <div className="text-xs text-slate">{t('sales.paid')}</div>
        <div className="text-lg font-bold text-ink mt-0.5">{formatMoney(sale.paid)}</div>
      </div>
      <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
        <div className="text-xs text-slate">{t('sales.refunded')}</div>
        <div className="text-lg font-bold text-slate mt-0.5">{formatMoney(sale.refunded)}</div>
      </div>
      <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
        <div className="text-xs text-slate">{t('sales.balance')}</div>
        <div className={`text-lg font-bold mt-0.5 ${isDebt ? 'text-launch-orange' : 'text-ink'}`}>
          {formatMoney(sale.balance)}
        </div>
      </div>
    </div>
  );
}
