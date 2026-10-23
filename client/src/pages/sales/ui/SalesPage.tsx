import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, TablePagination } from '@/shared/ui';
import { useSales, type SaleFilters as SaleFiltersType } from '@/entities/sale';
import { SalesFilters } from './SalesFilters';
import { SalesTable } from './SalesTable';

/** Sales list page with filtering, pagination and navigation to details. */
export function SalesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SaleFiltersType>({});

  const { data: salesPage, isLoading } = useSales(filters, page, 20);

  const handleFilterChange = (newFilters: SaleFiltersType) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">{t('sales.title')}</h1>
          <p className="text-xs text-slate mt-0.5">{t('sales.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/sell')} className="gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          {t('sell.title')}
        </Button>
      </div>

      <SalesFilters filters={filters} onFilterChange={handleFilterChange} />

      <SalesTable sales={salesPage?.items ?? []} isLoading={isLoading} />

      {salesPage && salesPage.total > 0 && (
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(salesPage.total / salesPage.pageSize))}
          total={salesPage.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
