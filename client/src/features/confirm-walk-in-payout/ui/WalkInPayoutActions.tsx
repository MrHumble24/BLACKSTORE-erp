import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Undo2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useAuthStore } from '@/entities/session';
import { useMarkWalkInPaid, useUndoWalkInPaid } from '@/entities/walk-in-purchase';

interface Props {
  lineId: number;
  paidAt: string | null;
  canUndo: boolean;
}

/**
 * Paid / Undo control for one walk-in payout (close_day only). The paid status text is shown
 * by the caller; this renders just the action. Server errors (e.g. 409 once the day is closed)
 * are shown as the toast text.
 */
export function WalkInPayoutActions({ lineId, paidAt, canUndo }: Props) {
  const { t } = useTranslation();
  const canConfirm = useAuthStore((state) => state.hasPermission('close_day'));
  const pay = useMarkWalkInPaid();
  const undo = useUndoWalkInPaid();
  const isPaid = paidAt !== null;
  const mutation = isPaid ? undo : pay;

  if (!canConfirm || (isPaid && !canUndo)) return null;

  const onClick = () =>
    mutation.mutate(lineId, {
      onSuccess: () => toast.success(t(isPaid ? 'walkIn.payoutUndone' : 'walkIn.payoutConfirmed')),
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('walkIn.payoutFailed')),
    });

  return (
    <Button
      type="button"
      size="sm"
      variant={isPaid ? 'outline' : 'default'}
      disabled={mutation.isPending}
      onClick={onClick}
      className="h-7 shrink-0 gap-1 rounded-full px-3 text-xs"
    >
      {isPaid ? <Undo2 className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      {t(isPaid ? 'walkIn.undo' : 'walkIn.markPaid')}
    </Button>
  );
}
