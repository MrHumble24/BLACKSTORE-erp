import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import { useItems, type ItemFilters } from '@/entities/item';
import { ItemFormDialog } from '@/features/manage-items';
import { ItemsFilters } from './ItemsFilters';
import { ItemsTable } from './ItemsTable';

function ItemsHeader({ onAdd, canReceiveBatch }: { onAdd: () => void; canReceiveBatch: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
          {t('items.title')}
        </h1>
        <p className="text-xs text-slate">{t('items.subtitle')}</p>
      </div>
      {canReceiveBatch && (
        <Button
          onClick={onAdd}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('items.addItem')}</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Devices inventory page with filters, pagination, and device creation.
 */
export function ItemsPage() {
  const canReceiveBatch = useAuthStore((state) => state.hasPermission('receive_batch'));

  const [filters, setFilters] = useState<ItemFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading } = useItems(filters, page, pageSize);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFilterChange = (newFilters: ItemFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <ItemsHeader onAdd={() => setAddDialogOpen(true)} canReceiveBatch={canReceiveBatch} />
      <ItemsFilters filters={filters} onChange={handleFilterChange} />

      <ItemsTable
        items={items}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />

      <ItemFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
