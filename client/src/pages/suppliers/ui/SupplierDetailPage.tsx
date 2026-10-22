import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, Card, TablePagination, BackLink } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import {
  useSupplier,
  useSupplierPayments,
  SUPPLIER_PAYMENTS_PAGE_SIZE,
  type Supplier,
} from '@/entities/supplier';
import { useBatches, BATCH_PAGE_SIZE, BatchSummaryTable } from '@/entities/batch';
import { SupplierFormDialog, SupplierPaymentDialog } from '@/features/manage-suppliers';
import { SupplierDetailHeader } from './SupplierDetailHeader';
import { SupplierPaymentsTable } from './SupplierPaymentsTable';

/** Balance stat card; money owed by the shop to this supplier (BR-8, view_cost only). */
function SupplierBalanceCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  if (!canViewCost) return null;

  return (
    <Card className="p-5">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{t('suppliers.balance')}</p>
      <p className="mt-1 text-lg font-semibold font-sf-pro-display text-ink tracking-tight">
        {formatMoney(supplier.balance ?? null)}
      </p>
    </Card>
  );
}

/** The supplier's batches (date, owner, location, counts and cost columns with view_cost). */
function SupplierBatchesSection({ supplierId }: { supplierId: number }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: batchPage, isLoading } = useBatches({ supplierId }, page);
  const totalPages = Math.ceil((batchPage?.total ?? 0) / BATCH_PAGE_SIZE) || 1;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-ink tracking-tight">
        {t('suppliers.batchesTitle')}
      </h2>
      <BatchSummaryTable batches={batchPage?.items ?? []} isLoading={isLoading} />
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={batchPage?.total ?? 0}
        onPageChange={setPage}
      />
    </section>
  );
}

/** Payments history with pagination plus the "Add payment" dialog. */
function SupplierPaymentsSection({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [payOpen, setPayOpen] = useState(false);

  const { data: paymentPage, isLoading } = useSupplierPayments(supplier.id, page);
  const totalPages =
    Math.ceil((paymentPage?.total ?? 0) / SUPPLIER_PAYMENTS_PAGE_SIZE) || 1;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink tracking-tight">
          {t('suppliers.paymentsTitle')}
        </h2>
        <Button
          onClick={() => setPayOpen(true)}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-8 shrink-0 shadow-none border-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('suppliers.addPayment')}</span>
        </Button>
      </div>
      <SupplierPaymentsTable payments={paymentPage?.items ?? []} isLoading={isLoading} />
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={paymentPage?.total ?? 0}
        onPageChange={setPage}
      />
      <SupplierPaymentDialog open={payOpen} onOpenChange={setPayOpen} supplierId={supplier.id} />
    </section>
  );
}

/**
 * Supplier detail page: contact data, balance (view_cost), the supplier's batches
 * and the payment history. Gated by manage_suppliers.
 */
export function SupplierDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const supplierId = Number(id);
  const [editOpen, setEditOpen] = useState(false);

  const { data: supplier, isLoading } = useSupplier(
    Number.isNaN(supplierId) ? undefined : supplierId,
  );

  if (isLoading) {
    return <div className="text-xs text-slate">{t('common.loading')}</div>;
  }

  if (!supplier) {
    return (
      <div className="space-y-4">
        <BackLink to="/suppliers" label={t('suppliers.backToList')} />
        <div className="text-xs text-slate">{t('suppliers.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SupplierDetailHeader supplier={supplier} onEdit={() => setEditOpen(true)} />
      <SupplierBalanceCard supplier={supplier} />
      <SupplierBatchesSection supplierId={supplier.id} />
      <SupplierPaymentsSection supplier={supplier} />
      <SupplierFormDialog open={editOpen} onOpenChange={setEditOpen} supplier={supplier} />
    </div>
  );
}
