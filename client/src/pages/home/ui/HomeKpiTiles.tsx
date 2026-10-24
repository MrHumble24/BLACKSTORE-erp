import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useAuthStore } from '@/features/auth';
import type { DashboardSummary } from '@/entities/dashboard';
import { CARD, NUM, money } from './homeStyle';

interface TileProps {
  label: string;
  value: string;
  note?: string;
  to?: string;
}

/** One KPI tile: label, headline figure, and a muted sub-note. Clickable when `to` is provided. */
function Tile({ label, value, note, to }: TileProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-slate group-hover:text-ink transition-colors">{label}</p>
        {to && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-control-gray/50 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 transition-colors group-hover:text-pricing-blue group-hover:bg-pricing-blue/10 dark:group-hover:bg-pricing-blue/20">
            <ArrowUpRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        )}
      </div>
      <p className={cn('mt-1.5 text-[1.5rem] font-semibold', NUM)}>{value}</p>
      {note && <p className="mt-1 text-[12px] tabular-nums text-slate/80">{note}</p>}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          CARD,
          'group flex flex-col px-5 py-4 cursor-pointer transition-all duration-150',
          'hover:border-pricing-blue/40 dark:hover:border-pricing-blue/40 hover:bg-studio-mist/40 dark:hover:bg-[#1e2026] hover:shadow-xs active:scale-[0.99]',
        )}
      >
        {content}
      </Link>
    );
  }

  return <Card className={cn(CARD, 'flex flex-col px-5 py-4')}>{content}</Card>;
}

/** Role-aware KPI grid. Profit tiles render only with view_profit and when the server sent them. */
export function HomeKpiTiles({ summary }: { summary: DashboardSummary }) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canViewProfit = hasPermission('view_profit');
  const canSell = hasPermission('sell');
  const canViewStock = hasPermission('view_stock');
  const canConsign = hasPermission('consign');
  const showProfit = canViewProfit && summary.today.profit != null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Tile
        label={t('home.kpi.todaySales')}
        value={money(summary.today.salesTotal)}
        note={t('home.kpi.salesCount', { count: summary.today.salesCount })}
        to={canSell ? '/sales' : undefined}
      />
      <Tile
        label={t('home.kpi.inStock')}
        value={String(summary.stock.inStockDevices)}
        note={t('home.kpi.atPartner', { count: summary.stock.atPartnerDevices })}
        to={canViewStock ? '/items' : undefined}
      />
      <Tile
        label={t('home.kpi.outstandingDebt')}
        value={money(summary.debts.customerDebtTotal)}
        note={t('home.kpi.debtors', { count: summary.debts.debtorCount })}
        to={canSell ? '/customers' : undefined}
      />
      <Tile
        label={t('home.kpi.overduePartner')}
        value={String(summary.partners.overdueCount)}
        note={t('home.kpi.overdueNote')}
        to={canConsign ? '/partners' : undefined}
      />
      {showProfit && (
        <Tile
          label={t('home.kpi.todayProfit')}
          value={money(summary.today.profit)}
          to="/reports/profit"
        />
      )}
      {showProfit && summary.monthNetProfit != null && (
        <Tile
          label={t('home.kpi.monthProfit')}
          value={money(summary.monthNetProfit)}
          to="/reports/profit"
        />
      )}
    </div>
  );
}

