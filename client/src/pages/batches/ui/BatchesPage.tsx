import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, TablePagination } from '@/shared/ui';
import { useBatches, BATCH_PAGE_SIZE, BatchSummaryTable } from '@/entities/batch';
import { BatchFormDialog } from '@/features/receive-batch';
import { BatchesFilters } from './BatchesFilters';

/** Page heading with the "New batch" action button. */
function BatchesPageHeader({ onNewBatch }: { onNewBatch: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {t('batches.title')}
        </h1>
        <p className="text-xs text-slate">{t('batches.subtitle')}</p>
      </div>
      <Button
        onClick={onNewBatch}
        className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{t('batches.newBatch')}</span>
      </Button>
    </div>
  );
}

/** Batches list page: supplier filter, paginated summary table, "New batch" (receive_batch). */
export function BatchesPage() {
  const [supplierId, setSupplierId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: batchPage, isLoading } = useBatches({ supplierId }, page);
  const totalPages = Math.ceil((batchPage?.total ?? 0) / BATCH_PAGE_SIZE) || 1;

  // Picking a new supplier starts the list over from page 1.
  const onSupplierChange = (supplier: number | undefined) => {
    setSupplierId(supplier);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <BatchesPageHeader onNewBatch={() => setCreateOpen(true)} />

      <BatchesFilters supplierId={supplierId} onChange={onSupplierChange} />

      <BatchSummaryTable
        batches={batchPage?.items ?? []}
        isLoading={isLoading}
        showSupplier
        showSplit
      />

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={batchPage?.total ?? 0}
        onPageChange={setPage}
      />

      <BatchFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
