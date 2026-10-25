import { useTranslation } from 'react-i18next';
import { Button, DateRangeInputs } from '@/shared/ui';
import type { CustomRange, Period } from '../model/period';

const PERIODS: { value: Period; labelKey: string }[] = [
  { value: 'today', labelKey: 'partners.periodToday' },
  { value: 'week', labelKey: 'partners.periodWeek' },
  { value: 'custom', labelKey: 'partners.periodCustom' },
];

interface PeriodPickerProps {
  period: Period;
  custom: CustomRange;
  onPeriodChange: (period: Period) => void;
  onCustomChange: (custom: CustomRange) => void;
}

/** Today / This week / Custom pills; the from/to date inputs appear only for Custom. */
export function PeriodPicker({ period, custom, onPeriodChange, onCustomChange }: PeriodPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      <div className="flex items-center gap-2">
        {PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange(option.value)}
            className="h-8 rounded-full px-3.5 text-xs"
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>
      {period === 'custom' && (
        <DateRangeInputs from={custom.from} to={custom.to} onChange={onCustomChange} />
      )}
    </div>
  );
}
