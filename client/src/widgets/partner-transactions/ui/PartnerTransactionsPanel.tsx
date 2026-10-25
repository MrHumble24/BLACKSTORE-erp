import { useState } from 'react';
import { TablePagination } from '@/shared/ui';
import { PARTNER_TRANSACTIONS_PAGE_SIZE, usePartnerTransactions } from '@/entities/partner';
import { rangeFor, type CustomRange, type Period } from '../model/period';
import { PeriodPicker } from './PeriodPicker';
import { TransactionsTotals } from './TransactionsTotals';
import { TransactionsTable } from './TransactionsTable';

const EMPTY_TOTALS = { handedOver: '0', sold: '0', returned: '0', paid: '0', refunded: '0' };

/** Transactions tab of /partners: period picker, range totals and the paginated feed across all partners (F29). */
export function PartnerTransactionsPanel() {
  const [period, setPeriod] = useState<Period>('today');
  const [custom, setCustom] = useState<CustomRange>({});
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePartnerTransactions(rangeFor(period, custom), page);
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <PeriodPicker
        period={period}
        custom={custom}
        onPeriodChange={(p) => { setPeriod(p); setPage(1); }}
        onCustomChange={(c) => { setCustom(c); setPage(1); }}
      />
      <TransactionsTotals totals={data?.totals ?? EMPTY_TOTALS} />
      <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
        <TransactionsTable transactions={data?.items ?? []} isLoading={isLoading} />
        {total > 0 && (
          <TablePagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PARTNER_TRANSACTIONS_PAGE_SIZE))}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
