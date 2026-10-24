import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Wallet, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
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
      className="flex items-center gap-3 py-2.5 transition-colors hover:text-apple-blue"
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-[13px] font-medium text-ink">{title}</span>
      <ChevronRight className="h-4 w-4 text-[#9da9bb]" />
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
      accent: 'bg-[#b64400]/10 text-[#b64400]',
    });
  }
  if (summary.partners.overdueCount > 0) {
    rows.push({
      to: '/partners',
      icon: Clock,
      title: t('home.overdueItems', { count: summary.partners.overdueCount }),
      accent: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    });
  }

  return (
    <Card className={cn(CARD, 'flex flex-col p-5')}>
      <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{t('home.needsAttention')}</h2>
      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="h-7 w-7 text-[#059669]" />
          <p className="text-[13px] text-[#9da9bb]">{t('home.allClear')}</p>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-[#edf2f9]">
          {rows.map((row) => (
            <Row key={row.to} {...row} />
          ))}
        </div>
      )}
    </Card>
  );
}
