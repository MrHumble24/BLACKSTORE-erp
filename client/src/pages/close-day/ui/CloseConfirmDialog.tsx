import { useTranslation } from 'react-i18next';
import { AlertTriangle, Banknote, CreditCard, Flag, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label,
} from '@/shared/ui';
import { cn, money, normalizeMoney } from '@/shared/lib';
import { getApiErrorMessage } from '@/shared/api';
import { useCloseDay, variance, VarianceBadge, type CurrentBusinessDay } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { NUM } from './constants';

/** Expected vs counted for one drawer, with the live variance verdict. */
function SummaryRow({
  icon, label, expected, counted,
}: {
  icon: React.ReactNode;
  label: string;
  expected: string;
  counted: string;
}) {
  const diff = variance(counted, expected);
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-slate">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn('text-xs font-semibold tabular-nums text-ink', NUM)}>
          {money(counted || '0')} <span className="text-slate/60 font-normal">/ {money(expected)}</span>
        </span>
        <VarianceBadge diff={diff} />
      </div>
    </div>
  );
}

interface CloseConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CurrentBusinessDay;
  form: CloseDayForm;
  onClosed: () => void;
}

/** Final confirmation before locking the day: a recap of the counts, variances, flags and note. */
export function CloseConfirmDialog({ open, onOpenChange, data, form, onClosed }: CloseConfirmDialogProps) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useCloseDay();

  const cashDiff = variance(form.countedCash, data.expectedCash);
  const cardDiff = variance(form.countedCard, data.expectedCard);
  const hasVariance = (cashDiff != null && Math.abs(cashDiff) >= 0.005) || (cardDiff != null && Math.abs(cardDiff) >= 0.005);

  const confirm = async () => {
    try {
      await mutateAsync({
        countedCash: normalizeMoney(form.countedCash),
        countedCard: normalizeMoney(form.countedCard),
        ...(form.flagList.length ? { flags: form.flagList } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      });
      toast.success(t('closeDay.closedSuccess'));
      onOpenChange(false);
      onClosed();
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? t('common.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-6">
        <DialogHeader className="gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-apple-blue/15 text-apple-blue dark:bg-apple-blue/25">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="font-sf-pro-display text-lg font-semibold">{t('closeDay.confirmTitle')}</DialogTitle>
            <DialogDescription className="text-xs text-slate">{t('closeDay.confirmSubtitle')}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Summary Drawer Card */}
          <div className="rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 p-3.5 divide-y divide-hairline-silver/30 dark:bg-control-gray/25">
            <SummaryRow
              icon={<Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              label={t('closeDay.cashDrawer')}
              expected={data.expectedCash}
              counted={form.countedCash}
            />
            <SummaryRow
              icon={<CreditCard className="h-4 w-4 text-apple-blue" />}
              label={t('closeDay.card')}
              expected={data.expectedCard}
              counted={form.countedCard}
            />
          </div>

          {/* Variance Warning if exists */}
          {hasVariance && (
            <div className="flex items-start gap-2.5 rounded-xl border border-launch-orange/25 bg-launch-orange/10 p-3 text-xs text-launch-orange dark:bg-launch-orange/15">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t('closeDay.varianceAlert')}</span>
            </div>
          )}

          {/* Flagged items notice */}
          {form.flagList.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-launch-orange/25 bg-launch-orange/10 px-3 py-2 text-xs font-medium text-launch-orange">
              <Flag className="h-3.5 w-3.5 shrink-0" />
              <span>{t('closeDay.flaggedCount', { n: form.flagList.length })}</span>
            </div>
          )}

          {/* Note Input */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="close-note" className="text-xs font-medium text-slate">
              {t('closeDay.note')}
            </Label>
            <Input
              id="close-note"
              value={form.note}
              onChange={(e) => form.setNote(e.target.value)}
              placeholder={t('closeDay.notePlaceholder')}
              className="rounded-xl text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="rounded-xl">
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={confirm} disabled={isPending} className="gap-2 rounded-xl font-semibold">
            <Lock className="h-3.5 w-3.5" />
            {isPending ? t('common.loading') : t('closeDay.confirmClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

