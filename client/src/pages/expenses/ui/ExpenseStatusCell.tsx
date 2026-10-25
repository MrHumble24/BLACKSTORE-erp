import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useSetLedgerStatus, type ExpenseStatus, type LedgerEntry } from '@/entities/ledger';

const STATUS_LABEL_KEYS: Record<ExpenseStatus, string> = {
  PENDING: 'ledger.statusPending',
  CONFIRMED: 'ledger.statusConfirmed',
  EXCLUDED: 'ledger.statusExcluded',
};

const STATUS_TRIGGER_CLASS: Record<ExpenseStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  CONFIRMED: 'bg-launch-orange/10 text-launch-orange border border-launch-orange/20',
  EXCLUDED: 'bg-control-gray text-slate',
};

const STATUS_OPTIONS: ExpenseStatus[] = ['PENDING', 'CONFIRMED', 'EXCLUDED'];

/**
 * Compact status select for an EXPENSE row, coloured by the current status: the Admin
 * switches it between waiting, confirmed and excluded. Only confirmed expenses count against profit (BR-5).
 */
export function ExpenseStatusCell({ entry }: { entry: LedgerEntry }) {
  const { t } = useTranslation();
  const { mutate, isPending } = useSetLedgerStatus();

  const handleChange = (next: string) => {
    if (next === entry.status) return;
    mutate(
      { id: entry.id, status: next as ExpenseStatus },
      { onError: (err) => toast.error(getApiErrorMessage(err) ?? t('ledger.statusUpdateFailed')) },
    );
  };

  return (
    <Select value={entry.status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        aria-label={t('ledger.setStatus')}
        className={`h-7 w-[7.5rem] rounded-full px-2.5 text-[11px] ${STATUS_TRIGGER_CLASS[entry.status]}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>{t(STATUS_LABEL_KEYS[status])}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
