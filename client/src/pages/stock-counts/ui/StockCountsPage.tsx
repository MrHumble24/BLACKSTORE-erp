import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, TablePagination } from '@/shared/ui';
import { useStockCounts, STOCK_COUNTS_PAGE_SIZE } from '@/entities/stock-count';
import { StartCountDialog } from '@/features/stock-count';
import { StockCountsTable } from './StockCountsTable';

/** Stock counts list with the "Start count" action (stock_count, W7). */
export function StockCountsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [startOpen, setStartOpen] = useState(false);
  const { data, isLoading } = useStockCounts({}, page);
  const totalPages = Math.ceil((data?.total ?? 0) / STOCK_COUNTS_PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('stockCount.title')}
          </h1>
          <p className="text-xs text-slate">{t('stockCount.subtitle')}</p>
        </div>
        <Button
          onClick={() => setStartOpen(true)}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('stockCount.startCount')}</span>
        </Button>
      </div>

      <StockCountsTable counts={data?.items ?? []} isLoading={isLoading} />
      <TablePagination page={page} totalPages={totalPages} total={data?.total ?? 0} onPageChange={setPage} />
      <StartCountDialog open={startOpen} onOpenChange={setStartOpen} />
    </div>
  );
}
