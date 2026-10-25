import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useAuthStore } from '@/entities/session';
import { useConfirmSales } from '../api';

/** Confirms every listed waiting sale in one request (close_day only, F33); the label carries the count. */
export function ConfirmAllSalesButton({ ids }: { ids: number[] }) {
  const { t } = useTranslation();
  const canConfirm = useAuthStore((state) => state.hasPermission('close_day'));
  const confirmAll = useConfirmSales();

  if (!canConfirm) return null;

  const onClick = () =>
    confirmAll.mutate(ids, {
      onSuccess: ({ confirmed }) => toast.success(t('sales.confirmedMany', { n: confirmed })),
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('sales.confirmFailed')),
    });

  return (
    <Button
      type="button"
      size="sm"
      disabled={ids.length === 0 || confirmAll.isPending}
      onClick={onClick}
      className="h-7 shrink-0 gap-1 rounded-full px-3 text-xs"
    >
      <CheckCheck className="h-3 w-3" />
      {t('sales.confirmAll', { n: ids.length })}
    </Button>
  );
}
