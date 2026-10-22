import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { useStockCount, type StockCount } from '@/entities/stock-count';
import { CountScanPanel, FinishCountButton } from '@/features/stock-count';
import { CountResult } from './CountResult';

/** Header strip: location, user, started, finished. */
function CountHeader({ count }: { count: StockCount }) {
  const { t } = useTranslation();
  const fields = [
    { label: t('stockCount.location'), value: count.location.name },
    { label: t('stockCount.user'), value: count.user.name },
    { label: t('stockCount.started'), value: formatDateTime(count.startedAt) },
    { label: t('stockCount.finished'), value: count.finishedAt ? formatDateTime(count.finishedAt) : t('stockCount.open') },
  ];
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
      {fields.map((f) => (
        <div key={f.label} className="space-y-0.5">
          <p className="text-[11px] text-slate tracking-[-0.01em]">{f.label}</p>
          <p className="text-xs font-medium text-ink">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

/** One stock count: header, scan panel + finish while open, and the live result. */
export function StockCountDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const countId = Number(id);
  const { data: count, isLoading } = useStockCount(Number.isNaN(countId) ? 0 : countId);

  if (isLoading) return <div className="text-xs text-slate">{t('common.loading')}</div>;
  if (!count) {
    return (
      <div className="space-y-4">
        <BackLink to="/stock-counts" label={t('stockCount.backToList')} />
        <div className="text-xs text-slate">{t('stockCount.notFound')}</div>
      </div>
    );
  }

  const isOpen = !count.finishedAt;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <BackLink to="/stock-counts" label={t('stockCount.backToList')} />
        {isOpen && <FinishCountButton countId={count.id} />}
      </div>
      <CountHeader count={count} />
      {isOpen && <CountScanPanel countId={count.id} />}
      <CountResult count={count} />
    </div>
  );
}
