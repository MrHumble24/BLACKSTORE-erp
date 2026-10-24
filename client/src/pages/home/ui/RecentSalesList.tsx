import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
        <p className="mt-6 text-center text-[13px] text-slate">{t('home.noRecentSales')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline-silver/60">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link
                to={`/sales/${sale.id}`}
                className="group flex items-center justify-between gap-3 px-2.5 py-2.5 -mx-2.5 rounded-xl transition-all duration-150 hover:bg-control-gray/40 dark:hover:bg-white/[0.03] cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink group-hover:text-pricing-blue transition-colors">
                    {sale.customer ?? t('home.walkInCustomer')}
                  </p>
                  <p className="text-[12px] tabular-nums text-slate">{formatDate(sale.date)}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <SaleStatusBadge status={sale.status} />
                  <span className={cn('text-[13px] font-semibold', NUM)}>{money(sale.total)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-150 group-hover:text-pricing-blue group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

