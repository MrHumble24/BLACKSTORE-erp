import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Undo2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useAuthStore } from '@/entities/session';
import { useConfirmSale, useUnconfirmSale } from '../api';

interface Props {
  saleId: number;
  confirmedAt: string | null;
  canUndo: boolean;
}

/**
 * Confirm / Undo control for one sale at the daily close (close_day only, F33). The status
 * text is shown by the caller; this renders just the action. Server errors (e.g. 409 once
 * the day is closed) are shown as the toast text.
 */
export function SaleConfirmActions({ saleId, confirmedAt, canUndo }: Props) {
  const { t } = useTranslation();
  const canConfirm = useAuthStore((state) => state.hasPermission('close_day'));
  const confirm = useConfirmSale();
  const undo = useUnconfirmSale();
  const isConfirmed = confirmedAt !== null;
  const mutation = isConfirmed ? undo : confirm;

  if (!canConfirm || (isConfirmed && !canUndo)) return null;

  const onClick = () =>
    mutation.mutate(saleId, {
      onSuccess: () => toast.success(t(isConfirmed ? 'sales.confirmUndone' : 'sales.confirmed')),
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('sales.confirmFailed')),
    });

  return (
    <Button
      type="button"
      size="sm"
      variant={isConfirmed ? 'outline' : 'default'}
      disabled={mutation.isPending}
      onClick={onClick}
      className="h-7 shrink-0 gap-1 rounded-full px-3 text-xs"
    >
      {isConfirmed ? <Undo2 className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      {t(isConfirmed ? 'sales.undo' : 'sales.confirm')}
    </Button>
  );
}
