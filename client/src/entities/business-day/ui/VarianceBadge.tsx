import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, HelpCircle, TrendingUp } from 'lucide-react';
import { cn, money } from '@/shared/lib';
import { isMatch } from '../lib/variance';

/**
 * Live reconciliation verdict: emerald "matches" at zero, destructive "short" when money is
 * missing (the fraud signal), amber "over" when there is more than expected.
 */
export function VarianceBadge({ diff, className }: { diff: number | null; className?: string }) {
  const { t } = useTranslation();

  if (diff == null) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-hairline-silver/60 bg-control-gray/50 px-2.5 py-0.5 text-[11px] font-medium text-slate dark:border-hairline-silver/40 dark:bg-control-gray/30',
        className,
      )}>
        <HelpCircle className="h-3 w-3 opacity-60" />
        {t('closeDay.enterCount')}
      </span>
    );
  }

  if (isMatch(diff)) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
        className,
      )}>
        <CheckCircle2 className="h-3 w-3" />
        {t('closeDay.matches')}
      </span>
    );
  }

  const short = diff < 0;
  const label = short ? t('closeDay.short') : t('closeDay.over');
  const Icon = short ? AlertTriangle : TrendingUp;
  const tone = short
    ? 'border-destructive/25 bg-destructive/10 text-destructive dark:bg-destructive/20'
    : 'border-launch-orange/25 bg-launch-orange/10 text-launch-orange dark:bg-launch-orange/20';

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums',
      tone,
      className,
    )}>
      <Icon className="h-3 w-3" />
      {label} {money(Math.abs(diff).toFixed(2))}
    </span>
  );
}

