import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { ProfitGroup } from '@/entities/report';

interface ProfitDistributionChartsProps {
  byCategory: ProfitGroup[];
}

interface CategoryRank {
  name: string;
  quantity: number;
  sales: number;
  profit: number;
}

/** Hairline-percent bar row: name + share bar + quantities, weighted by sales total. */
function CategoryRankRow({ rank, maxSales }: { rank: CategoryRank; maxSales: number }) {
  const { t } = useTranslation();
  const percentage = Math.max(2, Math.round((rank.sales / (maxSales || 1)) * 100));

  return (
    <li>
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-[13px] font-medium text-ink">{rank.name}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{formatMoney(rank.sales)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-studio-mist">
        <div className="h-full rounded-full bg-apple-blue/90" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-1 truncate text-[11px] text-steel" title={`${t('reports.qty')}: ${rank.quantity}; ${t('reports.profit')}: ${formatMoney(rank.profit)}`}>
        {t('reports.qty')} {rank.quantity} · {t('reports.profit')} {formatMoney(rank.profit)}
      </p>
    </li>
  );
}

/** Ranked category list with proportional bars (top seller first). */
export function ProfitDistributionCharts({ byCategory }: ProfitDistributionChartsProps) {
  const { t } = useTranslation();

  const ranks = byCategory
    .map((group) => ({
      name: group.name || t('reports.accessories'),
      quantity: group.quantity,
      sales: Number(group.sales) || 0,
      profit: Number(group.profit) || 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  if (ranks.length === 0) return null;
  const maxSales = ranks[0]?.sales ?? 1;

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        {t('reports.categoryDistribution', 'Category Performance')}
      </h3>
      <ul className="mt-4 flex-1 space-y-5">
        {ranks.map((rank) => (
          <CategoryRankRow key={rank.name} rank={rank} maxSales={maxSales} />
        ))}
      </ul>
    </Card>
  );
}
