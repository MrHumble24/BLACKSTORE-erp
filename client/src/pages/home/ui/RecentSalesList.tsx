import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui';
import { cn, formatDate } from '@/shared/lib';
import { SaleStatusBadge } from '@/entities/sale';
import type { DashboardRecentSale } from '@/entities/dashboard';
import { CARD, NUM, money } from './homeStyle';

/** Last few sales; each row links to its detail page. Empty state when there are none. */
export function RecentSalesList({ sales }: { sales: DashboardRecentSale[] }) {
  const { t } = useTranslation();

  return (
    <Card className={cn(CARD, 'flex flex-col p-5')}>
      <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{t('home.recentSales')}</h2>
      {sales.length === 0 ? (
        <p className="mt-6 text-center text-[13px] text-[#9da9bb]">{t('home.noRecentSales')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#edf2f9]">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link
                to={`/sales/${sale.id}`}
                className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-apple-blue"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {sale.customer ?? t('home.walkInCustomer')}
                  </p>
                  <p className="text-[12px] tabular-nums text-[#9da9bb]">{formatDate(sale.date)}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <SaleStatusBadge status={sale.status} />
                  <span className={cn('text-[13px] font-semibold', NUM)}>{money(sale.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
