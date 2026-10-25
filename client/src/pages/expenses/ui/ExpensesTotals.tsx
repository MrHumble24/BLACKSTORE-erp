import { useTranslation } from 'react-i18next';
import { TotalCard } from '@/shared/ui';
import type { LedgerPage } from '@/entities/ledger';

interface TotalsProps {
  totals: LedgerPage['totals'];
}

/**
 * Income, confirmed expenses, waiting, excluded and net totals over the whole filter.
 * Only confirmed expenses are subtracted from net profit (BR-5), so the other two are muted.
 */
export function ExpensesTotals({ totals }: TotalsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <TotalCard label={t('ledger.totalIncome')} value={totals.income} />
      <TotalCard label={t('ledger.totalExpense')} value={totals.expense} accent="text-launch-orange" />
      <TotalCard
        label={t('ledger.totalPendingExpense')}
        value={totals.pendingExpense}
        accent="text-amber-600 dark:text-amber-400"
      />
      <TotalCard label={t('ledger.totalExcludedExpense')} value={totals.excludedExpense} accent="text-slate" />
      <TotalCard label={t('ledger.totalNet')} value={totals.net} accent="text-apple-blue" />
    </div>
  );
}
