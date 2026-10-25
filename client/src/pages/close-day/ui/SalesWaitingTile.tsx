import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import { formatDate, money } from '@/shared/lib';
import type { PendingSaleRow } from '@/entities/business-day';
import { ConfirmAllSalesButton, SaleConfirmActions } from '@/features/confirm-sale';
import { ReviewTile, RowBody } from './ReviewSection';

/** One waiting sale: date, #id, seller, customer or partner, cash and card, and the Confirm button. */
function WaitingSaleRow({ row }: { row: PendingSaleRow }) {
  const { t } = useTranslation();
  const amount = `${t('closeDay.methodCash')} ${money(row.paidCash)} · ${t('closeDay.methodCard')} ${money(row.paidCard)}`;
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-studio-mist/50 dark:hover:bg-control-gray/20">
      <div className="min-w-0 flex-1">
        <RowBody
          primary={`#${row.id} · ${row.party ?? '—'}`}
          secondary={[formatDate(row.time), row.seller?.name ?? t('closeDay.unknownSeller')].join(' · ')}
          amount={amount}
        />
      </div>
      <SaleConfirmActions saleId={row.id} confirmedAt={row.confirmedAt} canUndo={false} />
    </div>
  );
}

interface Props {
  rows: PendingSaleRow[];
  /** Total waiting sales; may exceed the listed rows (the server caps the list at 200). */
  count: number;
  /** Cash + card of every waiting sale, for the count chip. */
  pendingTotal: number;
}

/** Sales waiting for the Admin's confirmation (any day); confirming one counts its money in today's drawer (F33). */
export function SalesWaitingTile({ rows, count, pendingTotal }: Props) {
  const { t } = useTranslation();
  return (
    <ReviewTile
      icon={<ShoppingBag className="h-4 w-4 text-launch-orange" />}
      iconBg="bg-launch-orange/15 dark:bg-launch-orange/25"
      title={t('sales.waitingTitle')}
      count={count}
      totalSum={pendingTotal}
      emptyText={t('sales.noneWaiting')}
      action={<ConfirmAllSalesButton ids={rows.map((r) => r.id)} />}
    >
      {rows.map((row) => <WaitingSaleRow key={row.id} row={row} />)}
    </ReviewTile>
  );
}
