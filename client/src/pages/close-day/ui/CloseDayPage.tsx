import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useCurrentBusinessDay } from '@/entities/business-day';
import { useCloseDayForm, variance } from '../model/useCloseDayForm';
import { CARD } from './constants';
import { VarianceBadge } from './VarianceBadge';
import { ReconcileHero } from './ReconcileHero';
import { ReviewSection } from './ReviewSection';
import { CloseConfirmDialog } from './CloseConfirmDialog';

/** Centered message card for the loading and error states. */
function StateCard({ children }: { children: React.ReactNode }) {
  return <Card className={cn(CARD, 'p-10 text-center text-sm text-slate')}>{children}</Card>;
}

/** The owner's daily close: count the drawers, review the day's money, flag anything off, then lock it. */
export function CloseDayPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCurrentBusinessDay();
  const form = useCloseDayForm();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-1">
        <h1 className="font-sf-pro-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {t('closeDay.title')}
        </h1>
        <p className="text-xs text-slate">
          {data
            ? t('closeDay.openedAt', { time: new Date(data.day.openedAt).toLocaleString() })
            : t('closeDay.subtitle')}
        </p>
      </div>

      {isLoading && <StateCard>{t('common.loading')}</StateCard>}
      {isError && <StateCard>{t('closeDay.loadError')}</StateCard>}

      {data && (
        <>
          <ReconcileHero data={data} form={form} />
          <ReviewSection data={data} form={form} />

          <div className="sticky bottom-0 z-10 -mx-4 border-t border-hairline-silver/70 bg-gallery-white/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate">{t('closeDay.cashDrawer')}</span>
                <VarianceBadge diff={variance(form.countedCash, data.expectedCash)} />
                <span className="ml-2 text-[12px] text-slate">{t('closeDay.card')}</span>
                <VarianceBadge diff={variance(form.countedCard, data.expectedCard)} />
              </div>
              <Button type="button" disabled={!form.canClose} onClick={() => setConfirmOpen(true)}>
                {t('closeDay.closeDay')}
              </Button>
            </div>
          </div>

          <CloseConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            data={data}
            form={form}
            onClosed={form.reset}
          />
        </>
      )}
    </div>
  );
}
