import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib';
import { SaleStatusBadge, type Sale } from '@/entities/sale';
import { SaleActions } from './SaleActions';

interface SaleHeaderProps {
  sale: Sale;
  /** Re-reads the sale after the Telegram invite dialog closes. */
  onRefresh: () => void;
}

/** Header section for sale details with metadata and the receipt / Telegram actions. */
export function SaleHeader({ sale, onRefresh }: SaleHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-hairline-silver/70 pb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-ink">#{sale.id}</h1>
          <SaleStatusBadge status={sale.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
          <span>{t('sales.date')}: {formatDate(sale.createdAt, true)}</span>
          <span>{t('sales.location')}: {sale.location.name}</span>
          <span>{t('sales.seller')}: {sale.seller.name}</span>
          {sale.customer && (
            <span>
              {t('sales.customer')}:{' '}
              <Link to={`/customers/${sale.customer.id}`} className="text-apple-blue hover:underline font-medium">
                {sale.customer.name} ({sale.customer.phone})
              </Link>
            </span>
          )}
        </div>
      </div>
      <SaleActions sale={sale} onRefresh={onRefresh} />
    </div>
  );
}
