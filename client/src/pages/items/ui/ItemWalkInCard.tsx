import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { formatDate, money } from '@/shared/lib';
import type { Item } from '@/entities/item';
import { WalkInPayoutActions } from '@/features/confirm-walk-in-payout';

type WalkIn = NonNullable<Item['walkIn']>;

/** "Paid on {date} by {name}", "Paid on {date}" for migrated rows, or "Waiting for payout". */
function PayoutStatus({ walkIn }: { walkIn: WalkIn }) {
  const { t } = useTranslation();
  if (!walkIn.paidAt) {
    return <span className="font-medium text-launch-orange">{t('walkIn.waiting')}</span>;
  }
  const date = formatDate(walkIn.paidAt);
  return (
    <span className="text-slate">
      {walkIn.paidBy
        ? t('walkIn.paidOn', { date, name: walkIn.paidBy.name })
        : t('walkIn.paidOnNoUser', { date })}
    </span>
  );
}

/** Walk-in purchase of this device (F32): seller, agreed price and payout status; view_cost only. */
export function ItemWalkInCard({ walkIn }: { walkIn: WalkIn }) {
  const { t } = useTranslation();
  return (
    <Card className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 shadow-none">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base font-semibold text-ink">{t('walkIn.cardTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-slate">{t('walkIn.seller')}:</span>
            <div className="mt-0.5 text-sm font-semibold text-ink">{walkIn.sellerName}</div>
          </div>
          <div className="font-mono">
            <span className="text-slate">{t('walkIn.agreedPrice')}:</span>
            <div className="mt-0.5 text-sm font-semibold text-ink">{money(walkIn.amount)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-hairline-silver/40 pt-3">
          <PayoutStatus walkIn={walkIn} />
          <WalkInPayoutActions lineId={walkIn.lineId} paidAt={walkIn.paidAt} canUndo={walkIn.canUndo} />
        </div>
      </CardContent>
    </Card>
  );
}
