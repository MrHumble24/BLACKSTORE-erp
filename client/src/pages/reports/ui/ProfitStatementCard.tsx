import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitTotals } from '@/entities/report';
import { CARD } from './chartPalette';
import { money } from './reportFormat';

interface ProfitStatementCardProps {
  totals: ProfitTotals;
  canViewCost: boolean;
}

type Tone = 'neutral' | 'positive' | 'negative';

const TONE: Record<Tone, string> = {
  neutral: 'text-ink',
  positive: 'text-emerald-600',
  negative: 'text-destructive',
};

/** Zero amounts stay neutral so they don't read as a win or a loss. */
function toneFor(value: string, active: Tone): Tone {
  return Number(value) === 0 ? 'neutral' : active;
}

/** One label/amount pair in the statement grid. */
function Figure({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline-silver/40 py-2.5 last:border-b-0">
      <span className="text-[13px] text-slate">{label}</span>
      <span className={cn('text-[15px] font-semibold tabular-nums tracking-[-0.01em]', TONE[tone])}>
        {money(value)}
      </span>
    </div>
  );
}

/** Secondary figures that aren't headline KPIs: cost, refunds, investor/shop split and other income. */
export function ProfitStatementCard({ totals, canViewCost }: ProfitStatementCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn(CARD, 'p-5 sm:p-6')}>
      <h3 className="mb-1 text-[13px] font-semibold tracking-[-0.01em] text-ink">{t('reports.statement')}</h3>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <div>
          {canViewCost && <Figure label={t('reports.cost')} value={totals.cost ?? '0'} />}
          <Figure label={t('reports.refunded')} value={totals.refunded} tone={toneFor(totals.refunded, 'negative')} />
          <Figure label={t('reports.otherIncome')} value={totals.otherIncome} tone={toneFor(totals.otherIncome, 'positive')} />
        </div>
        <div>
          <Figure label={t('reports.investorShare')} value={totals.investorShare} />
          <Figure label={t('reports.businessShare')} value={totals.businessShare} />
        </div>
      </div>
    </Card>
  );
}
