import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth';
import { useDashboardSummary } from '@/entities/dashboard';
import { HomeGreeting } from './HomeGreeting';
import { QuickActions } from './QuickActions';
import { HomeKpiTiles } from './HomeKpiTiles';
import { StockValuationCard } from './StockValuationCard';
import { RecentSalesList } from './RecentSalesList';
import { NeedsAttentionList } from './NeedsAttentionList';
import { HomeSkeleton } from './HomeSkeleton';

/** Role-aware home dashboard: greeting, quick actions, KPI tiles and the two activity lists. */
export function HomePage() {
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name ?? '');
  const { data, isLoading, isError } = useDashboardSummary();

  return (
    <div className="space-y-5">
      <HomeGreeting name={name} />
      <QuickActions />

      {isLoading && <HomeSkeleton />}
      {isError && <p className="text-[13px] text-slate">{t('common.error')}</p>}

      {data && (
        <>
          <HomeKpiTiles summary={data} />
          <StockValuationCard summary={data} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentSalesList sales={data.recentSales} />
            <NeedsAttentionList summary={data} />
          </div>
        </>
      )}
    </div>
  );
}
