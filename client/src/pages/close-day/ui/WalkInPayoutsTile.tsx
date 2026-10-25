import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandCoins } from 'lucide-react';
import { TablePagination } from '@/shared/ui';
import { formatDate, money } from '@/shared/lib';
import {
  usePendingWalkInPayouts,
  WALK_IN_PAYOUTS_PAGE_SIZE,
  type WalkInPayoutRow,
} from '@/entities/walk-in-purchase';
import { WalkInPayoutActions } from '@/features/confirm-walk-in-payout';
import { ReviewTile, RowBody } from './ReviewSection';

/** One waiting payout: seller, purchase date and device, amount, and the Paid button. */
function PayoutRow({ row }: { row: WalkInPayoutRow }) {
  const device = row.item ? [row.item.model, row.item.identifier].filter(Boolean).join(' ') : null;
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-studio-mist/50 dark:hover:bg-control-gray/20">
      <div className="min-w-0 flex-1">
        <RowBody
          primary={row.seller.name}
          secondary={[formatDate(row.createdAt), device].filter(Boolean).join(' · ')}
          amount={money(row.amount)}
          amountClass="text-launch-orange font-bold"
        />
      </div>
      <WalkInPayoutActions lineId={row.lineId} paidAt={row.paidAt} canUndo={false} />
    </div>
  );
}

/** Walk-in sellers not paid yet (any day); confirming one subtracts it from today's drawer (F32). */
export function WalkInPayoutsTile({ pendingTotal }: { pendingTotal: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingWalkInPayouts(page);
  const total = data?.total ?? 0;

  return (
    <ReviewTile
      icon={<HandCoins className="h-4 w-4 text-launch-orange" />}
      iconBg="bg-launch-orange/15 dark:bg-launch-orange/25"
      title={t('walkIn.pendingTitle')}
      count={total}
      totalSum={Number(pendingTotal)}
      emptyText={isLoading ? t('common.loading') : t('walkIn.noPending')}
    >
      {data?.items.map((row) => <PayoutRow key={row.lineId} row={row} />)}
      {total > WALK_IN_PAYOUTS_PAGE_SIZE && (
        <TablePagination
          page={page}
          totalPages={Math.ceil(total / WALK_IN_PAYOUTS_PAGE_SIZE)}
          total={total}
          onPageChange={setPage}
        />
      )}
    </ReviewTile>
  );
}
