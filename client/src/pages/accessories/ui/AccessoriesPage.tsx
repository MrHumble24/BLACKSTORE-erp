import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import {
  useAccessoryStock,
  type AccessoryStockFilters,
} from '@/entities/accessory-stock';
import { AccessoryStockFormDialog } from '@/features/manage-accessory-stock';
import { AccessoriesFilters } from './AccessoriesFilters';
import { AccessoriesTable } from './AccessoriesTable';

function AccessoriesHeader({ onAdd, canReceiveBatch }: { onAdd: () => void; canReceiveBatch: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
          {t('accessories.title')}
        </h1>
        <p className="text-xs text-slate">{t('accessories.subtitle')}</p>
      </div>
      {canReceiveBatch && (
        <Button
          onClick={onAdd}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('accessories.addStock')}</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Accessories inventory page displaying non-serialized product stock and costs.
 */
export function AccessoriesPage() {
  const canReceiveBatch = useAuthStore((state) => state.hasPermission('receive_batch'));

  const [filters, setFilters] = useState<AccessoryStockFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useAccessoryStock(filters, page, pageSize);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFilterChange = (newFilters: AccessoryStockFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <AccessoriesHeader onAdd={() => setDialogOpen(true)} canReceiveBatch={canReceiveBatch} />
      <AccessoriesFilters filters={filters} onChange={handleFilterChange} />

      <AccessoriesTable
        items={items}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />

      <AccessoryStockFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
