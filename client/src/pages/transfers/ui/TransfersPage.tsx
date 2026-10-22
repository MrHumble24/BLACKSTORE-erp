import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, TablePagination } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useTransfers, TRANSFERS_PAGE_SIZE, type TransferFilters } from '@/entities/transfer';
import { TransfersFilters } from './TransfersFilters';
import { TransfersTable } from './TransfersTable';

/** Transfers list: filters, paginated table, and "New transfer" for transfer_stock (W6). */
export function TransfersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canTransfer = useAuthStore((state) => state.hasPermission('transfer_stock'));
  const [filters, setFilters] = useState<TransferFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTransfers(filters, page);
  const totalPages = Math.ceil((data?.total ?? 0) / TRANSFERS_PAGE_SIZE) || 1;

  const onFilterChange = (next: TransferFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('transfers.title')}
          </h1>
          <p className="text-xs text-slate">{t('transfers.subtitle')}</p>
        </div>
        {canTransfer && (
          <Button
            onClick={() => navigate('/transfers/new')}
            className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('transfers.newTransfer')}</span>
          </Button>
        )}
      </div>

      <TransfersFilters filters={filters} onChange={onFilterChange} />
      <TransfersTable transfers={data?.items ?? []} isLoading={isLoading} />
      <TablePagination page={page} totalPages={totalPages} total={data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
