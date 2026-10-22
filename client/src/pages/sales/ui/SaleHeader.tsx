import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import { SaleStatusBadge, type Sale } from '@/entities/sale';

interface SaleHeaderProps {
  sale: Sale;
}

/** Header section for sale details with metadata and receipt print trigger. */
export function SaleHeader({ sale }: SaleHeaderProps) {
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(`/sales/${sale.id}/receipt`, '_blank')}
        className="gap-1.5 text-xs h-9"
      >
        <Printer className="h-4 w-4" />
        {t('sales.receiptButton')}
      </Button>
    </div>
  );
}
