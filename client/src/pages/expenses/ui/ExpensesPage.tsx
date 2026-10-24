import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, TablePagination } from '@/shared/ui';
import { useLedger, LEDGER_PAGE_SIZE, type LedgerFilters } from '@/entities/ledger';
import { LedgerEntryDialog } from '@/features/record-ledger';
import { ExpensesFilters } from './ExpensesFilters';
import { ExpensesTotals } from './ExpensesTotals';
import { ExpensesTable } from './ExpensesTable';

/** Income/expense ledger: filters, totals, paginated table and "Add entry" (manage_expenses). */
export function ExpensesPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<LedgerFilters>({});
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useLedger(filters, page);
  const totalPages = Math.ceil((data?.total ?? 0) / LEDGER_PAGE_SIZE) || 1;

  const onFilterChange = (next: LedgerFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('ledger.title')}
          </h1>
          <p className="text-xs text-slate">{t('ledger.subtitle')}</p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('ledger.addEntry')}</span>
        </Button>
      </div>

      <ExpensesFilters filters={filters} onChange={onFilterChange} />
      {data && <ExpensesTotals totals={data.totals} />}
      <ExpensesTable entries={data?.items ?? []} isLoading={isLoading} />
      <TablePagination page={page} totalPages={totalPages} total={data?.total ?? 0} onPageChange={setPage} />
      <LedgerEntryDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
