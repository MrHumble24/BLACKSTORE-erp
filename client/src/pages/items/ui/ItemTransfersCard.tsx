import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '@/shared/lib';
import { useTransfers } from '@/entities/transfer';

/** Small card listing the transfers that moved this device (date, from → to, user). */
export function ItemTransfersCard({ itemId }: { itemId: number }) {
  const { t } = useTranslation();
  const { data } = useTransfers({ itemId }, 1);
  const transfers = data?.items ?? [];
  if (transfers.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 space-y-3">
      <p className="text-xs font-semibold text-ink">{t('transfers.title')}</p>
      <ul className="space-y-1.5">
        {transfers.map((transfer) => (
          <li key={transfer.id} className="text-xs">
            <Link to={`/transfers/${transfer.id}`} className="text-apple-blue underline-offset-4 hover:underline">
              {formatDate(transfer.date)}
            </Link>
            <span className="text-ink"> · {transfer.fromLocation.name} → {transfer.toLocation.name}</span>
            <span className="text-slate"> · {transfer.user.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
