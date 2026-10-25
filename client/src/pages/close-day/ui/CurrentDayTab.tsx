import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Lock } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useCurrentBusinessDay, variance, VarianceBadge, type CurrentBusinessDay } from '@/entities/business-day';
import { useCloseDayForm, type CloseDayForm } from '../model/useCloseDayForm';
import { CARD } from './constants';
import { ReconcileHero } from './ReconcileHero';
import { DayEventsSection } from './DayEventsSection';
import { ReviewSection } from './ReviewSection';
import { WalkInPayoutsTile } from './WalkInPayoutsTile';
import { SalesWaitingTile } from './SalesWaitingTile';
import { CloseConfirmDialog } from './CloseConfirmDialog';

/** Centered message card for the loading and error states. */
function StateCard({ children }: { children: React.ReactNode }) {
  return <Card className={cn(CARD, 'p-12 text-center text-sm font-medium text-slate')}>{children}</Card>;
}

/** Sticky bottom bar: live variance of both drawers and the Close day button. */
function CloseBar({ data, form, onClose }: { data: CurrentBusinessDay; form: CloseDayForm; onClose: () => void }) {
  const { t } = useTranslation();
  const cashDiff = variance(form.countedCash, data.expectedCash);
  const cardDiff = variance(form.countedCard, data.expectedCard);
  const hasVariance = (cashDiff != null && Math.abs(cashDiff) >= 0.005) || (cardDiff != null && Math.abs(cardDiff) >= 0.005);

  return (
    <div className="sticky bottom-4 z-20 mt-6 rounded-2xl border border-hairline-silver/80 bg-card/90 px-5 py-3.5 shadow-lg backdrop-blur-md transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-slate">{t('closeDay.cashDrawer')}</span>
            <VarianceBadge diff={cashDiff} />
          </div>
          <div className="h-4 w-px bg-hairline-silver/70" />
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-apple-blue" />
            <span className="text-xs font-medium text-slate">{t('closeDay.card')}</span>
            <VarianceBadge diff={cardDiff} />
          </div>
          {data.pendingSalesCount > 0 && (
            <span className="rounded-full bg-launch-orange/10 px-2.5 py-0.5 text-xs font-medium text-launch-orange">
              {t('closeDay.pendingSalesWarning', { n: data.pendingSalesCount })}
            </span>
          )}
          {form.canClose && hasVariance && (
            <span className="hidden text-xs font-medium text-launch-orange sm:inline-block">
              {t('closeDay.varianceWarning')}
            </span>
          )}
        </div>

        <Button
          type="button"
          disabled={!form.canClose}
          onClick={onClose}
          className="gap-2 rounded-xl px-5 font-sf-pro-display text-sm font-semibold shadow-xs transition-all active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" />
          {t('closeDay.closeDay')}
        </Button>
      </div>
    </div>
  );
}

/** The open day: count the drawers, see every event, flag anything off, then lock it. */
export function CurrentDayTab() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCurrentBusinessDay();
  const form = useCloseDayForm();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <StateCard>{t('common.loading')}</StateCard>;
  if (isError || !data) return <StateCard>{t('closeDay.loadError')}</StateCard>;

  return (
    <div className="space-y-6">
      <ReconcileHero data={data} form={form} />
      <DayEventsSection events={data.events} form={form} />
      <SalesWaitingTile
        rows={data.pendingSales}
        count={data.pendingSalesCount}
        pendingTotal={Number(data.breakdown.pendingSalesCash) + Number(data.breakdown.pendingSalesCard)}
      />
      <WalkInPayoutsTile pendingTotal={data.breakdown.pendingWalkInPurchases} />
      <ReviewSection data={data} form={form} />
      <CloseBar data={data} form={form} onClose={() => setConfirmOpen(true)} />
      <CloseConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        data={data}
        form={form}
        onClosed={form.reset}
      />
    </div>
  );
}

