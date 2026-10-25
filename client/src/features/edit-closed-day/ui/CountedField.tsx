import { useTranslation } from 'react-i18next';
import { useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { TextField } from '@/shared/ui';
import { money } from '@/shared/lib';
import { variance, VarianceBadge } from '@/entities/business-day';
import type { EditClosedDayValues } from '../model/editClosedDay.schema';

interface CountedFieldProps {
  name: 'countedCash' | 'countedCard';
  label: string;
  expected: string | null;
  control: Control<EditClosedDayValues>;
  register: UseFormRegister<EditClosedDayValues>;
  error?: string;
  disabled: boolean;
}

/** One drawer: the frozen expected total (read-only), the counted input and the live variance. */
export function CountedField({ name, label, expected, control, register, error, disabled }: CountedFieldProps) {
  const { t } = useTranslation();
  const counted = useWatch({ control, name });
  const diff = expected == null ? null : variance(counted, expected);
  return (
    <div className="space-y-2 rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-slate">{label}</span>
        <VarianceBadge diff={diff} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-slate">{t('closeDay.expected')}</span>
        <span className="font-sf-pro-display text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
          {money(expected)}
        </span>
      </div>
      <TextField id={`edit-${name}`} label={t('closeDay.counted')} inputMode="decimal" placeholder="0.00"
        error={error} disabled={disabled} className="tabular-nums" {...register(name)} />
    </div>
  );
}
