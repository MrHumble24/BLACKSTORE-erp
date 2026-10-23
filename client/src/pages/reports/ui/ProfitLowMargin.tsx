import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitLowMarginLine } from '@/entities/report';
import { CARD } from './chartPalette';
import { money } from './reportFormat';

interface ProfitLowMarginProps {
  lines: ProfitLowMarginLine[];
}

/** Colours the margin badge by severity: red under 5%, amber under 15%, else neutral. */
function marginTone(pct: number): string {
  if (pct < 5) return 'bg-destructive/10 text-destructive';
  if (pct < 15) return 'bg-amber-100 text-amber-700';
  return 'bg-studio-mist text-slate';
}

/** Watchlist of sale lines sold at a thin gross margin, worst first. */
export function ProfitLowMargin({ lines }: ProfitLowMarginProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6')}>
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.lowMarginTitle')}</h3>
      {lines.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-steel">{t('reports.lowMarginEmpty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline-silver/40">
          {lines.map((line) => {
            const name = line.item ? `${line.productModel} (${line.item.code})` : line.productModel;
            return (
              <li key={`${line.saleId}-${line.saleItemId}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink" title={name}>{name}</p>
                  <p className="text-[11px] text-steel tabular-nums">
                    {money(line.salePrice)} · {t('reports.profit')} {money(line.profit)}
                  </p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums', marginTone(line.marginPct))}>
                  {line.marginPct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
