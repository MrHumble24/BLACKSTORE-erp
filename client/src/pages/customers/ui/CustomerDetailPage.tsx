import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackLink, TablePagination } from '@/shared/ui';
import { useCustomer } from '@/entities/customer';
import { useSales, type SaleSummary } from '@/entities/sale';
import { CustomerFormDialog } from '@/features/manage-customers';
import { PaymentDialog } from '@/features/record-payment';
import { CustomerContactCard } from './CustomerContactCard';
import { CustomerDebtCard } from './CustomerDebtCard';
import { CustomerSalesTable } from './CustomerSalesTable';

/** Customer profile page composing contact, debt and sales ledger views. */
export function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);

  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentSale, setPaymentSale] = useState<SaleSummary | null>(null);

  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: salesPage } = useSales({ customerId }, page, 20);

  if (isLoading || !customer) {
    return <div className="p-8 text-center text-xs text-slate">{t(isLoading ? 'common.loading' : 'customers.notFound')}</div>;
  }

  const totalPages = Math.max(1, Math.ceil((salesPage?.total ?? 0) / (salesPage?.pageSize ?? 20)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackLink to="/customers" label={t('customers.backToList')} />
      <div className="border-b border-hairline-silver/70 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink">{customer.name}</h1>
        <p className="text-xs text-slate font-mono mt-0.5">{customer.phone}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CustomerContactCard customer={customer} onEdit={() => setEditDialogOpen(true)} />
        <CustomerDebtCard debt={customer.debt} />
      </div>
      <CustomerSalesTable sales={salesPage?.items ?? []} onPay={setPaymentSale} />
      {salesPage && salesPage.total > 0 && (
        <TablePagination page={page} totalPages={totalPages} total={salesPage.total} onPageChange={setPage} />
      )}
      <CustomerFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
      />
      {paymentSale && (
        <PaymentDialog
          open={Boolean(paymentSale)}
          onOpenChange={(isOpen) => !isOpen && setPaymentSale(null)}
          saleId={paymentSale.id}
          balance={paymentSale.balance}
        />
      )}
    </div>
  );
}
