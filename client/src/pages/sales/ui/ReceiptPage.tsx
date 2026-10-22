import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSale } from '@/entities/sale';
import { useReceiptSettings } from '@/entities/receipt-settings';
import { ReceiptView } from '@/features/print-receipt';

/** Standalone printable receipt page rendered without navigation chrome. */
export function ReceiptPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const saleId = Number(id);

  const { data: sale, isLoading } = useSale(saleId);
  const { data: settings } = useReceiptSettings();

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate">{t('common.loading')}</div>;
  }

  if (!sale) {
    return <div className="p-8 text-center text-xs text-slate">{t('sales.notFound')}</div>;
  }

  return (
    <ReceiptView
      sale={sale}
      settings={settings}
      onBack={() => navigate(`/sales/${sale.id}`)}
    />
  );
}
