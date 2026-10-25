import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import type { Sale } from '@/entities/sale';

interface SaleMetricsProps {
  sale: Sale;
}

/** Metric strip showing total, cost, profit (if permitted), paid, refunds and outstanding debt balance. */
export function SaleMetrics({ sale }: SaleMetricsProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const canViewProfit = useAuthStore((state) => state.hasPermission('view_profit'));
  const isDebt = Number(sale.balance) > 0;

  const hasAnyCost = sale.items.some((it) => it.unitCost != null);
  const totalCost = canViewCost && hasAnyCost
    ? sale.items.reduce((sum, it) => sum + (it.unitCost ? Number(it.unitCost) * it.quantity : 0), 0)
    : null;

  const profit = totalCost != null && canViewProfit
    ? Number(sale.total) - totalCost
    : null;

  const cardCount = 4 + (totalCost != null ? 1 : 0) + (profit != null ? 1 : 0);
  const gridCols = cardCount === 6
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
    : cardCount === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-4`}>
      <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
        <div className="text-xs text-slate">{t('sales.total')}</div>
        <div className="text-lg font-bold text-ink mt-0.5">{formatMoney(sale.total)}</div>
      </div>
      {totalCost != null && (
        <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
          <div className="text-xs text-slate">{t('sales.cost')}</div>
          <div className="text-lg font-bold text-ink mt-0.5">{formatMoney(totalCost)}</div>
        </div>
      )}
      {profit != null && (
        <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4">
          <div className="text-xs text-slate">{t('sales.profit')}</div>
          <div className={`text-lg font-bold mt-0.5 ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-launch-orange'}`}>
            {formatMoney(profit)}
          </div>
        </div>
      )}
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
