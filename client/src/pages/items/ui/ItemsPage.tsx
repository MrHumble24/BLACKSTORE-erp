import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ScanLine } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import { useItems, type ItemStatus } from '@/entities/item';
import { ItemFormDialog } from '@/features/manage-items';
import { ItemsStatsCard } from './ItemsStatsCard';
import { ItemsStatusTabs } from './ItemsStatusTabs';
import { ItemsFilters } from './ItemsFilters';
import { ItemsTable } from './ItemsTable';
import { useItemUrlParams } from './useItemUrlParams';

function ItemsHeader({
  onAdd,
  onBulkAdd,
  canReceiveBatch,
  total,
}: {
  onAdd: () => void;
  onBulkAdd: () => void;
  canReceiveBatch: boolean;
  total: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
            {t('items.title')}
          </h1>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-studio-mist border border-hairline-silver/60 text-slate dark:bg-white/[0.06]">
              {total}
            </span>
          )}
        </div>
        <p className="text-xs text-slate">{t('items.subtitle')}</p>
      </div>
      {canReceiveBatch && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onBulkAdd}
            className="gap-2 rounded-full text-xs font-medium px-5 h-9 shrink-0 border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist cursor-pointer dark:bg-card"
          >
            <ScanLine className="h-3.5 w-3.5" />
            <span>{t('bulkAdd.button')}</span>
          </Button>
          <Button
            onClick={onAdd}
            className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('items.addItem')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Devices inventory page with KPI stats, status tabs, toolbar filters,
 * sortable headers, and URL-synchronized state.
 */
export function ItemsPage() {
  const navigate = useNavigate();
  const canReceiveBatch = useAuthStore((state) => state.hasPermission('receive_batch'));
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { filters, page, pageSize, setFilters, setPage, setPageSize, toggleSort } =
    useItemUrlParams();

  const { data, isLoading } = useItems(filters, page, pageSize);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSelectStatus = (status?: ItemStatus) => {
    setFilters({ ...filters, status });
  };

  return (
    <div className="space-y-4">
      <ItemsHeader
        onAdd={() => setAddDialogOpen(true)}
        onBulkAdd={() => navigate('/items/bulk-add')}
        canReceiveBatch={canReceiveBatch}
        total={total}
      />

      <ItemsStatsCard
        currentStatus={filters.status}
        totalFiltered={total}
        onSelectStatus={handleSelectStatus}
      />

      <ItemsStatusTabs
        currentStatus={filters.status}
        onChange={handleSelectStatus}
      />

      <ItemsFilters filters={filters} onChange={setFilters} />

      <ItemsTable
        items={items}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={toggleSort}
      />

      <ItemFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
