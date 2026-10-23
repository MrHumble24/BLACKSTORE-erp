import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Badge, Button, BackLink } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import type { Batch } from '@/entities/batch';

/** One labelled summary line inside the batch header card. */
function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{label}</p>
      <p className="text-xs font-medium text-ink">{value}</p>
    </div>
  );
}

/** Cost + split extra fields shown only to view_cost users (never empty fields). */
function BatchCostFields({ batch }: { batch: Batch }) {
  const { t } = useTranslation();

  return (
    <>
      <HeaderField label={t('batches.itemsCost')} value={formatMoney(batch.itemsCost ?? null)} />
      <HeaderField
        label={t('batches.extraCostTotal')}
        value={formatMoney(batch.extraCostTotal ?? null)}
      />
      <div className="space-y-0.5">
        <p className="text-[11px] text-slate tracking-[-0.01em]">{t('batches.costSplitMethod')}</p>
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px]">
          {t(`batches.split.${batch.costSplitMethod}`)}
        </Badge>
      </div>
    </>
  );
}

interface UnpricedBadgeProps {
  batch: Batch;
  /** Price-all needs manage_prices; without it the badge is informational only. */
  clickable: boolean;
  onOpenPriceAll: () => void;
}

/** Warning pill for lines still at price 0 (view_cost); clickable opens the price-all dialog. */
function UnpricedBadge({ batch, clickable, onOpenPriceAll }: UnpricedBadgeProps) {
  const { t } = useTranslation();
  if (!batch.unpricedLines) return null;

  const className = 'px-3 py-1.5 rounded-full text-[11px] bg-launch-orange/10 text-launch-orange border border-launch-orange/20 font-medium';
  if (!clickable) {
    return (
      <Badge variant="secondary" className={className}>
        {t('batches.unpricedLines', { count: batch.unpricedLines })}
      </Badge>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenPriceAll}
      title={t('batches.priceAllTitle')}
      className={`inline-flex items-center rounded-full h-8 hover:bg-launch-orange/20 transition-colors ${className}`}
    >
      {t('batches.unpricedLines', { count: batch.unpricedLines })}
    </button>
  );
}

interface BatchHeaderCardProps {
  batch: Batch;
  /** Omitted when the batch is locked for this user, which hides the Edit button. */
  onEdit?: () => void;
  /** Opens the price-all dialog (manage_prices only). */
  onOpenPriceAll?: () => void;
}

/** Header card: supplier, owner, location, date, note; costs and split with view_cost only. */
export function BatchHeaderCard({ batch, onEdit, onOpenPriceAll }: BatchHeaderCardProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));

  return (
    <div className="space-y-3">
      <BackLink to="/batches" label={t('batches.backToList')} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {batch.supplier.name}
        </h1>
        <div className="flex items-center gap-2">
          {canViewCost && (
            <UnpricedBadge
              batch={batch}
              clickable={Boolean(canManagePrices && onOpenPriceAll)}
              onOpenPriceAll={onOpenPriceAll ?? (() => undefined)}
            />
          )}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
            >
              <Pencil className="h-3 w-3 text-apple-blue" />
              <span>{t('batches.editBatch')}</span>
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        <HeaderField label={t('batches.supplier')} value={batch.supplier.name} />
        <HeaderField label={t('batches.owner')} value={batch.investor.name} />
        <HeaderField label={t('batches.location')} value={batch.location.name} />
        <HeaderField label={t('batches.arrivalDate')} value={batch.arrivalDate.slice(0, 10)} />
        <HeaderField label={t('batches.note')} value={batch.note ?? '—'} />
        {canViewCost && <BatchCostFields batch={batch} />}
      </div>
    </div>
  );
}
