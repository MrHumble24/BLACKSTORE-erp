import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Wallet, Clock, PackageX, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { DashboardSummary } from '@/entities/dashboard';
import { CARD } from './homeStyle';

interface AttentionRow {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  accent: string;
}

/** Row linking to the screen that resolves it. */
function Row({ to, icon: Icon, title, accent }: AttentionRow) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-2.5 py-2.5 -mx-2.5 rounded-xl transition-all duration-150 hover:bg-control-gray/40 dark:hover:bg-white/[0.03] cursor-pointer"
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105', accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-[13px] font-medium text-ink group-hover:text-pricing-blue transition-colors">{title}</span>
      <ChevronRight className="h-4 w-4 text-slate/40 transition-transform duration-150 group-hover:text-pricing-blue group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Debtors to chase and overdue partner items; friendly empty state when nothing is pending. */
export function NeedsAttentionList({ summary }: { summary: DashboardSummary }) {
  const { t } = useTranslation();
  const rows: AttentionRow[] = [];

  if (summary.debts.debtorCount > 0) {
    rows.push({
      to: '/customers',
      icon: Wallet,
      title: t('home.debtorsToChase', { count: summary.debts.debtorCount }),
      accent: 'bg-launch-orange/10 text-launch-orange',
    });
  }
  if (summary.partners.overdueCount > 0) {
    rows.push({
      to: '/partners',
      icon: Clock,
      title: t('home.overdueItems', { count: summary.partners.overdueCount }),
      accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    });
  }
  if (summary.lowStockCount > 0) {
    rows.push({
      to: '/accessories?stockLevel=LOW_STOCK',
      icon: PackageX,
      title: t('home.lowStockAccessories', { count: summary.lowStockCount }),
      accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    });
  }

  return (
    <Card className={cn(CARD, 'flex flex-col p-5')}>
      <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{t('home.needsAttention')}</h2>
      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          <p className="text-[13px] text-slate">{t('home.allClear')}</p>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-hairline-silver/60">
          {rows.map((row) => (
            <Row key={row.to} {...row} />
          ))}
        </div>
      )}
    </Card>
  );
}
