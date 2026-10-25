import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib';
import type { Sale } from '@/entities/sale';
import { SaleConfirmActions } from '@/features/confirm-sale';

/** "Confirmed on {date} by {name}" / "Waiting for confirmation" plus Confirm / Undo for close_day users (F33). */
export function SaleConfirmStatus({ sale }: { sale: Sale }) {
  const { t } = useTranslation();
  const { confirmedAt, confirmedBy } = sale;
  let text: string;
  if (!confirmedAt) text = t('sales.waiting');
  else if (confirmedBy) text = t('sales.confirmedOn', { date: formatDate(confirmedAt, true), name: confirmedBy.name });
  else text = t('sales.confirmedOnNoUser', { date: formatDate(confirmedAt, true) });

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={confirmedAt ? 'text-slate' : 'font-medium text-launch-orange'}>{text}</span>
      <SaleConfirmActions saleId={sale.id} confirmedAt={confirmedAt} canUndo={sale.canUndo} />
    </div>
  );
}
