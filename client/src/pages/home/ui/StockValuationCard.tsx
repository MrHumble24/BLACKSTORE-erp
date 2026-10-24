import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Boxes, Smartphone, Handshake, Headphones, ArrowUpRight } from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useAuthStore } from '@/features/auth';
import type { DashboardSummary } from '@/entities/dashboard';
import { CARD, NUM, money } from './homeStyle';

interface ValuesRowsProps {
  countText: string;
  saleValue?: string;
  costValue?: string;
  canViewCost: boolean;
}

function ItemValuesRows({ countText, saleValue, costValue, canViewCost }: ValuesRowsProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs text-slate font-medium">{countText}</p>
      <div className="flex items-baseline justify-between pt-1 border-t border-hairline-silver/40">
        <span className="text-[11px] text-slate">{t('home.stockValuation.retailValue')}</span>
        <span className={cn('text-xs font-semibold', NUM)}>{saleValue ? money(saleValue) : '—'}</span>
      </div>
      {canViewCost && (
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-slate">{t('home.stockValuation.costValue')}</span>
          <span className={cn('text-xs font-semibold text-slate-600 dark:text-slate-400', NUM)}>
            {costValue ? money(costValue) : '—'}
          </span>
        </div>
      )}
    </div>
  );
}

interface ValuationItemProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  countText: string;
  saleValue?: string;
  costValue?: string;
  to?: string;
  canViewCost: boolean;
}

function ValuationItem({
  icon: Icon,
  title,
  countText,
  saleValue,
  costValue,
  to,
  canViewCost,
}: ValuationItemProps) {
  const body = (
    <div className="flex flex-col justify-between h-full p-3.5 rounded-xl bg-control-gray/30 dark:bg-white/[0.02] border border-hairline-silver/50 hover:border-pricing-blue/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-studio-mist dark:bg-white/[0.06] text-slate">
            <Icon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          </div>
          <span className="text-xs font-medium text-ink">{title}</span>
        </div>
        {to && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-control-gray/50 dark:bg-white/[0.05] text-slate-500">
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </div>
      <ItemValuesRows
        countText={countText}
        saleValue={saleValue}
        costValue={costValue}
        canViewCost={canViewCost}
      />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group cursor-pointer">
        {body}
      </Link>
    );
  }
  return body;
}

interface ValuationHeaderProps {
  canViewCost: boolean;
  totalSale?: string;
  totalCost?: string;
}

function ValuationHeader({ canViewCost, totalSale, totalCost }: ValuationHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline-silver/60">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pricing-blue/10 text-pricing-blue">
          <Boxes className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
            {t('home.stockValuation.title')}
          </h2>
          <p className="text-[11px] text-slate">{t('home.stockValuation.subtitle')}</p>
        </div>
      </div>
      {(totalSale || (canViewCost && totalCost)) && (
        <div className="flex items-center gap-3 text-xs">
          {totalSale && (
            <div className="text-right">
              <span className="text-[10px] text-slate uppercase block leading-none">
                {t('home.stockValuation.retailValue')}
              </span>
              <span className={cn('font-semibold text-xs', NUM)}>{money(totalSale)}</span>
            </div>
          )}
          {canViewCost && totalCost && (
            <div className="text-right pl-3 border-l border-hairline-silver/60">
              <span className="text-[10px] text-slate uppercase block leading-none">
                {t('home.stockValuation.costValue')}
              </span>
              <span className={cn('font-semibold text-xs text-slate-600 dark:text-slate-400', NUM)}>
                {money(totalCost)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ValuationGridProps {
  stock: DashboardSummary['stock'];
  canViewCost: boolean;
  canViewStock: boolean;
  canConsign: boolean;
}

function ValuationGrid({ stock, canViewCost, canViewStock, canConsign }: ValuationGridProps) {
  const { t } = useTranslation();
  const accCountText =
    stock.accessoriesCount != null
      ? t('home.stockValuation.itemsCount', { count: stock.accessoriesCount })
      : '—';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <ValuationItem
        icon={Smartphone}
        title={t('home.stockValuation.inStockDevices')}
        countText={t('home.stockValuation.devicesCount', { count: stock.inStockDevices })}
        saleValue={stock.inStockSaleValue}
        costValue={stock.inStockCostValue}
        to={canViewStock ? '/items?status=IN_STOCK' : undefined}
        canViewCost={canViewCost}
      />
      <ValuationItem
        icon={Handshake}
        title={t('home.stockValuation.atPartnerDevices')}
        countText={t('home.stockValuation.devicesCount', { count: stock.atPartnerDevices })}
        saleValue={stock.atPartnerSaleValue}
        costValue={stock.atPartnerCostValue}
        to={canConsign ? '/partners' : undefined}
        canViewCost={canViewCost}
      />
      <ValuationItem
        icon={Headphones}
        title={t('home.stockValuation.accessories')}
        countText={accCountText}
        costValue={stock.accessoriesCostValue}
        to={canViewStock ? '/accessories' : undefined}
        canViewCost={canViewCost}
      />
    </div>
  );
}

/** Dashboard stock valuation card: shows in-stock, at-partner and accessory counts and values. */
export function StockValuationCard({ summary }: { summary: DashboardSummary }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canViewCost = hasPermission('view_cost') || hasPermission('view_profit');
  const { stock } = summary;

  return (
    <Card className={cn(CARD, 'flex flex-col p-4 sm:p-5 space-y-3')}>
      <ValuationHeader
        canViewCost={canViewCost}
        totalSale={stock.totalSaleValue}
        totalCost={stock.totalCostValue}
      />
      <ValuationGrid
        stock={stock}
        canViewCost={canViewCost}
        canViewStock={hasPermission('view_stock')}
        canConsign={hasPermission('consign')}
      />
    </Card>
  );
}
