import { useTranslation } from 'react-i18next';
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
function SummaryRow({ label, expected, counted }: { label: string; expected: string; counted: string }) {
  const diff = variance(counted, expected);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline-silver/40 py-2.5 last:border-b-0">
      <span className="text-[13px] text-slate">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[12px] tabular-nums text-slate">
          {money(counted || '0')} / {money(expected)}
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('closeDay.confirmTitle')}</DialogTitle>
          <DialogDescription>{t('closeDay.confirmSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="mt-1">
          <SummaryRow label={t('closeDay.cashDrawer')} expected={data.expectedCash} counted={form.countedCash} />
          <SummaryRow label={t('closeDay.card')} expected={data.expectedCard} counted={form.countedCard} />
        </div>

        {form.flagList.length > 0 && (
          <p className={cn(NUM, 'text-[13px] font-medium text-launch-orange')}>
            {t('closeDay.flaggedCount', { n: form.flagList.length })}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="close-note" className="text-[12px] text-slate">{t('closeDay.note')}</Label>
          <Input id="close-note" value={form.note} onChange={(e) => form.setNote(e.target.value)} placeholder={t('closeDay.notePlaceholder')} />
        </div>

        <DialogFooter className="gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={confirm} disabled={isPending}>
            {isPending ? t('common.loading') : t('closeDay.confirmClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
