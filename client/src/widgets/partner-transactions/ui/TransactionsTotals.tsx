import { useTranslation } from 'react-i18next';
import { TotalCard } from '@/shared/ui';
import type { PartnerTransactionsPage } from '@/entities/partner';

/** Handed over, sold, returned, paid and refunded totals over the whole selected range. */
export function TransactionsTotals({ totals }: { totals: PartnerTransactionsPage['totals'] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <TotalCard label={t('partners.totalHandedOver')} value={totals.handedOver} accent="text-apple-blue" />
      <TotalCard label={t('partners.totalSold')} value={totals.sold} />
      <TotalCard label={t('partners.totalReturned')} value={totals.returned} accent="text-slate" />
      <TotalCard label={t('partners.totalPaid')} value={totals.paid} accent="text-emerald-600 dark:text-emerald-400" />
      <TotalCard label={t('partners.totalRefunded')} value={totals.refunded} accent="text-launch-orange" />
    </div>
  );
}
