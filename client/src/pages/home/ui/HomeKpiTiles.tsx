import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useAuthStore } from '@/features/auth';
import type { DashboardSummary } from '@/entities/dashboard';
import { CARD, NUM, money } from './homeStyle';

/** One KPI tile: label, headline figure, and a muted sub-note. */
function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className={cn(CARD, 'flex flex-col px-5 py-4')}>
      <p className="text-[12px] font-medium text-slate">{label}</p>
      <p className={cn('mt-1.5 text-[1.5rem] font-semibold', NUM)}>{value}</p>
      {note && <p className="mt-1 text-[12px] tabular-nums text-slate/80">{note}</p>}
    </Card>
  );
}

/** Role-aware KPI grid. Profit tiles render only with view_profit and when the server sent them. */
export function HomeKpiTiles({ summary }: { summary: DashboardSummary }) {
  const { t } = useTranslation();
  const canViewProfit = useAuthStore((s) => s.hasPermission('view_profit'));
  const showProfit = canViewProfit && summary.today.profit != null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Tile
        label={t('home.kpi.todaySales')}
        value={money(summary.today.salesTotal)}
        note={t('home.kpi.salesCount', { count: summary.today.salesCount })}
      />
      <Tile
        label={t('home.kpi.inStock')}
        value={String(summary.stock.inStockDevices)}
        note={t('home.kpi.atPartner', { count: summary.stock.atPartnerDevices })}
      />
      <Tile
        label={t('home.kpi.outstandingDebt')}
        value={money(summary.debts.customerDebtTotal)}
        note={t('home.kpi.debtors', { count: summary.debts.debtorCount })}
      />
      <Tile
        label={t('home.kpi.overduePartner')}
        value={String(summary.partners.overdueCount)}
        note={t('home.kpi.overdueNote')}
      />
      {showProfit && <Tile label={t('home.kpi.todayProfit')} value={money(summary.today.profit)} />}
      {showProfit && summary.monthNetProfit != null && (
        <Tile label={t('home.kpi.monthProfit')} value={money(summary.monthNetProfit)} />
      )}
    </div>
  );
}
