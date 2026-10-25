import { useTranslation } from 'react-i18next';
import { cn, money } from '@/shared/lib';
import { isMatch } from './constants';

/**
 * Live reconciliation verdict: emerald "matches" at zero, destructive "short" when money is
 * missing (the fraud signal), amber "over" when there is more than expected.
 */
export function VarianceBadge({ diff }: { diff: number | null }) {
  const { t } = useTranslation();
  if (diff == null) {
    return <span className="rounded-full bg-control-gray px-2.5 py-0.5 text-[11px] font-medium text-slate">{t('closeDay.enterCount')}</span>;
  }
  if (isMatch(diff)) {
    return <span className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-600">{t('closeDay.matches')}</span>;
  }
  const short = diff < 0;
  const label = short ? t('closeDay.short') : t('closeDay.over');
  const tone = short ? 'bg-destructive/10 text-destructive' : 'bg-launch-orange/10 text-launch-orange';
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums', tone)}>
      {label} {money(Math.abs(diff).toFixed(2))}
    </span>
  );
}
