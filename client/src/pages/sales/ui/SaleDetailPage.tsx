import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { useSale, type SaleItem } from '@/entities/sale';
import { PaymentDialog } from '@/features/record-payment';
import { ReturnDialog } from '@/features/return-sale';
import { SaleHeader } from './SaleHeader';
import { SaleMetrics } from './SaleMetrics';
import { SaleItemsCard } from './SaleItemsCard';
import { SaleLedgerCards } from './SaleLedgerCards';

/** Detailed view of a single sale including lines, payment ledger, and return actions. */
export function SaleDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const saleId = Number(id);

  const { data: sale, isLoading } = useSale(saleId);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<SaleItem | null>(null);

  if (isLoading || !sale) {
    return <div className="p-8 text-center text-xs text-slate">{t(isLoading ? 'common.loading' : 'sales.notFound')}</div>;
  }

  const handleOpenReturn = (item: SaleItem) => {
    setSelectedReturnItem(item);
    setReturnDialogOpen(true);
  };

  const existingLineRefunds = selectedReturnItem
    ? sale.returns
        .filter((r) => r.saleItemId === selectedReturnItem.id)
        .reduce((sum, r) => sum + Number(r.refundAmount), 0)
    : 0;

  return (
    <div className="space-y-6">
      <BackLink to="/sales" label={t('sales.backToList')} />
      <SaleHeader sale={sale} />
      <SaleMetrics sale={sale} />
      <SaleItemsCard items={sale.items} onReturn={handleOpenReturn} />
      <SaleLedgerCards sale={sale} onAddPayment={() => setPaymentDialogOpen(true)} />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        saleId={sale.id}
        balance={sale.balance}
      />
      <ReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        saleId={sale.id}
        saleBalance={sale.balance}
        saleItem={selectedReturnItem}
        existingLineRefunds={existingLineRefunds}
      />
    </div>
  );
}
