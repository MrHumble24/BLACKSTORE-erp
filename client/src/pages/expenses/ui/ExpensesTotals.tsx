import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib';
import type { LedgerPage } from '@/entities/ledger';

interface TotalsProps {
  totals: LedgerPage['totals'];
}

/** One totals card. */
function TotalCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 space-y-1">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{label}</p>
      <p className={`text-xl font-semibold tracking-tight ${accent ?? 'text-ink'}`}>{formatMoney(value)}</p>
    </div>
  );
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
