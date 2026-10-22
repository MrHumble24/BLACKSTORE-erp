import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib';

interface Totals {
  income: string;
  expense: string;
  net: string;
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

/** Income / expense / net totals over the whole filter. */
export function ExpensesTotals({ totals }: { totals: Totals }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TotalCard label={t('ledger.totalIncome')} value={totals.income} />
      <TotalCard label={t('ledger.totalExpense')} value={totals.expense} accent="text-launch-orange" />
      <TotalCard label={t('ledger.totalNet')} value={totals.net} accent="text-apple-blue" />
    </div>
  );
}
