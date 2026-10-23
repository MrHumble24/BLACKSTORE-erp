import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { InvestorReportRow } from '@/entities/report';

interface InvestorSummaryStripProps {
  totals: Omit<InvestorReportRow, 'investor'>;
}

interface StripTile {
  label: string;
  value: string;
  emphasize?: boolean;
}

/** Quiet summary row above the investor breakdown table (units, sales, profit and shares). */
export function InvestorSummaryStrip({ totals }: InvestorSummaryStripProps) {
  const { t } = useTranslation();

  const tiles: StripTile[] = [
    { label: t('reports.itemsSold'), value: String(totals.itemsSold) },
    { label: t('reports.sales'), value: formatMoney(totals.sales) },
    { label: t('reports.profit'), value: formatMoney(totals.profit), emphasize: true },
    { label: t('reports.investorShare'), value: formatMoney(totals.investorShare) },
    { label: t('reports.businessShare'), value: formatMoney(totals.businessShare) },
  ];

  return (
    <Card className="grid grid-cols-2 gap-y-6 p-5 sm:grid-cols-3 sm:p-6 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label}>
          <p className="text-xs text-slate">{tile.label}</p>
          <p
            className={
              tile.emphasize
                ? 'mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em] text-emerald-600'
                : 'mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em] text-ink'
            }
          >
            {tile.value}
          </p>
        </div>
      ))}
    </Card>
  );
}
