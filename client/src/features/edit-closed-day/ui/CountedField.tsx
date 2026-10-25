import { useTranslation } from 'react-i18next';
import { useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { Banknote, Copy, CreditCard } from 'lucide-react';
import { Button, TextField } from '@/shared/ui';
import { money } from '@/shared/lib';
import { variance, VarianceBadge } from '@/entities/business-day';
import type { EditClosedDayValues } from '../model/editClosedDay.schema';

interface CountedFieldProps {
  name: 'countedCash' | 'countedCard';
  label: string;
  expected: string | null;
  control: Control<EditClosedDayValues>;
  register: UseFormRegister<EditClosedDayValues>;
  onFillExpected?: () => void;
  error?: string;
  disabled: boolean;
}

/** One drawer: the frozen expected total (read-only), the counted input and the live variance. */
export function CountedField({
  name, label, expected, control, register, onFillExpected, error, disabled,
}: CountedFieldProps) {
  const { t } = useTranslation();
  const counted = useWatch({ control, name });
  const diff = expected == null ? null : variance(counted, expected);
  const isCash = name === 'countedCash';

  return (
    <div className="space-y-2.5 rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 p-3.5 dark:bg-control-gray/25">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isCash ? (
            <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <CreditCard className="h-4 w-4 text-apple-blue" />
          )}
          <span className="font-sf-pro-display text-xs font-semibold text-ink">{label}</span>
        </div>
        <VarianceBadge diff={diff} />
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-card/60 px-3 py-2 border border-hairline-silver/40">
        <span className="text-[11px] font-medium text-slate">{t('closeDay.expected')}</span>
        <span className="font-sf-pro-display text-sm font-bold tabular-nums tracking-[-0.01em] text-ink">
          {money(expected)}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate">{t('closeDay.counted')}</span>
          {expected != null && onFillExpected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFillExpected}
              disabled={disabled}
              className="h-5 gap-1 rounded-md px-1.5 text-[10px] text-slate hover:text-ink"
            >
              <Copy className="h-2.5 w-2.5" />
              {t('closeDay.fillExpected')}
            </Button>
          )}
        </div>
        <TextField
          id={`edit-${name}`}
          label=""
          inputMode="decimal"
          placeholder="0.00"
          error={error}
          disabled={disabled}
          className="font-sf-pro-display tabular-nums tracking-[-0.01em]"
          {...register(name)}
        />
      </div>
    </div>
  );
}

