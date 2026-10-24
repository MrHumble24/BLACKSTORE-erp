import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Handshake, CheckCircle2, Layers } from 'lucide-react';
import { cn, money } from '@/shared/lib';
import { useAuthStore } from '@/features/auth';
import { useDashboardSummary } from '@/entities/dashboard';
import type { ItemStatus } from '@/entities/item';

interface StatTileProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  count: number | string;
  active?: boolean;
  saleValue?: string;
  costValue?: string;
  canViewCost?: boolean;
  onClick?: () => void;
}

function StatTile({
  icon: Icon,
  title,
  count,
  active,
  saleValue,
  costValue,
  canViewCost,
  onClick,
}: StatTileProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer w-full',
        'bg-gallery-white hover:bg-studio-mist/70 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]',
        active
          ? 'border-pricing-blue shadow-sm ring-1 ring-pricing-blue/30'
          : 'border-hairline-silver/70 hover:border-steel/50',
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-pricing-blue text-white'
                : 'bg-studio-mist text-slate group-hover:text-ink dark:bg-white/[0.06]',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium text-slate group-hover:text-ink">{title}</span>
        </div>
        <span className="font-mono text-base font-semibold tracking-tight text-ink">
          {count}
        </span>
      </div>

      {(saleValue || (canViewCost && costValue)) && (
        <div className="mt-2.5 pt-2 border-t border-hairline-silver/40 w-full space-y-1">
          {saleValue && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate">{t('items.stats.retailValuation')}</span>
              <span className="font-mono font-medium text-ink">{money(saleValue)}</span>
            </div>
          )}
          {canViewCost && costValue && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate">{t('items.stats.costValuation')}</span>
              <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                {money(costValue)}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

interface ItemsStatsCardProps {
  currentStatus?: ItemStatus;
  totalFiltered: number;
  onSelectStatus: (status?: ItemStatus) => void;
}

/** Executive inventory KPI metrics row with 1-click status filtering. */
export function ItemsStatsCard({
  currentStatus,
  totalFiltered,
  onSelectStatus,
}: ItemsStatsCardProps) {
  const { t } = useTranslation();
  const { data: summary } = useDashboardSummary();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canViewCost = hasPermission('view_cost') || hasPermission('view_profit');

  const stock = summary?.stock;
  const inStockCount = stock?.inStockDevices ?? '—';
  const atPartnerCount = stock?.atPartnerDevices ?? '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        icon={Smartphone}
        title={t('items.stats.inStock')}
        count={inStockCount}
        active={currentStatus === 'IN_STOCK'}
        saleValue={stock?.inStockSaleValue}
        costValue={stock?.inStockCostValue}
        canViewCost={canViewCost}
        onClick={() =>
          onSelectStatus(currentStatus === 'IN_STOCK' ? undefined : 'IN_STOCK')
        }
      />
      <StatTile
        icon={Handshake}
        title={t('items.stats.atPartner')}
        count={atPartnerCount}
        active={currentStatus === 'AT_PARTNER'}
        saleValue={stock?.atPartnerSaleValue}
        costValue={stock?.atPartnerCostValue}
        canViewCost={canViewCost}
        onClick={() =>
          onSelectStatus(currentStatus === 'AT_PARTNER' ? undefined : 'AT_PARTNER')
        }
      />
      <StatTile
        icon={CheckCircle2}
        title={t('items.stats.sold')}
        count={summary?.today?.salesCount ?? '—'}
        active={currentStatus === 'SOLD'}
        onClick={() =>
          onSelectStatus(currentStatus === 'SOLD' ? undefined : 'SOLD')
        }
      />
      <StatTile
        icon={Layers}
        title={t('items.stats.totalItems')}
        count={totalFiltered}
        active={!currentStatus}
        onClick={() => onSelectStatus(undefined)}
      />
    </div>
  );
}
