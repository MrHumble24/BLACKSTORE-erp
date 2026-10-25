import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow, Badge,
} from '@/shared/ui';
import { formatDate, formatMoney } from '@/shared/lib';
import type { LedgerEntry } from '@/entities/ledger';
import { ExpenseStatusCell } from './ExpenseStatusCell';

/** The profit column: income keeps the check/dash mark, expenses show their confirmation status. */
function ProfitCell({ entry }: { entry: LedgerEntry }) {
  if (entry.type === 'EXPENSE') return <ExpenseStatusCell entry={entry} />;
  return entry.countsInProfit
    ? <Check className="h-3.5 w-3.5 text-apple-blue" />
    : <span className="text-slate">—</span>;
}

function EntryRow({ entry }: { entry: LedgerEntry }) {
  const { t } = useTranslation();
  const isIncome = entry.type === 'INCOME';
  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs text-slate">{formatDate(entry.date)}</TableCell>
      <TableCell>
        <Badge variant={isIncome ? 'default' : 'secondary'} className="px-2.5 py-0.5 text-[11px]">
          {t(isIncome ? 'ledger.income' : 'ledger.expense')}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-ink">{entry.category}</TableCell>
      <TableCell className="text-xs font-medium text-ink">{formatMoney(entry.amount)}</TableCell>
      <TableCell className="text-xs"><ProfitCell entry={entry} /></TableCell>
      <TableCell className="text-xs text-slate">{entry.note ?? '—'}</TableCell>
      <TableCell className="text-xs text-slate">{entry.user.name}</TableCell>
    </TableRow>
  );
}

/** Ledger table: date, type, category, amount, profit mark/status, note, user. */
export function ExpensesTable({ entries, isLoading }: { entries: LedgerEntry[]; isLoading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('ledger.date')}</TableHead>
            <TableHead>{t('ledger.type')}</TableHead>
            <TableHead>{t('ledger.category')}</TableHead>
            <TableHead>{t('ledger.amount')}</TableHead>
            <TableHead>{t('ledger.inProfit')}</TableHead>
            <TableHead>{t('ledger.note')}</TableHead>
            <TableHead>{t('ledger.user')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={7} />}
          {!isLoading && entries.length === 0 && (
            <TableEmptyRow colSpan={7} message={t('ledger.noEntries')} />
          )}
          {!isLoading && entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}
        </TableBody>
      </Table>
    </div>
  );
}
