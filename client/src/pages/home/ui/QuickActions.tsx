import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingCart, PackagePlus, HandCoins, Search, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import type { Permission } from '@/shared/config/permissions';
import { cn } from '@/shared/lib';
import { CARD } from './homeStyle';

interface QuickAction {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  permission: Permission;
  accent: string;
  badgeBg: string;
}

/** Primary operational shortcuts; each gated by the route's own permission. */
const ACTIONS: QuickAction[] = [
  {
    to: '/sell',
    labelKey: 'home.actions.newSale',
    icon: ShoppingCart,
    permission: 'sell',
    accent: 'text-apple-blue',
    badgeBg: 'bg-apple-blue/10 dark:bg-apple-blue/15',
  },
  {
    to: '/batches',
    labelKey: 'home.actions.receiveBatch',
    icon: PackagePlus,
    permission: 'receive_batch',
    accent: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
  {
    to: '/purchases/walk-in',
    labelKey: 'home.actions.walkIn',
    icon: HandCoins,
    permission: 'buy_walk_in',
    accent: 'text-launch-orange',
    badgeBg: 'bg-launch-orange/10 dark:bg-launch-orange/15',
  },
  {
    to: '/items',
    labelKey: 'home.actions.findItem',
    icon: Search,
    permission: 'view_stock',
    accent: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/15',
  },
];

/** Large tappable quick-action buttons with clear click affordance and arrows. */
export function QuickActions() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visible = ACTIONS.filter((a) => hasPermission(a.permission));
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {visible.map(({ to, labelKey, icon: Icon, accent, badgeBg }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            CARD,
            'group relative flex flex-col justify-between p-4 cursor-pointer transition-all duration-150',
            'hover:border-pricing-blue/50 dark:hover:border-pricing-blue/50 hover:bg-studio-mist/40 dark:hover:bg-[#1e2026] hover:shadow-xs active:scale-[0.98]',
          )}
        >
          <div className="flex items-start justify-between w-full">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105', badgeBg)}>
              <Icon className={cn('h-5 w-5', accent)} />
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-control-gray/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 transition-colors group-hover:text-pricing-blue group-hover:bg-pricing-blue/10 dark:group-hover:bg-pricing-blue/20">
              <ArrowUpRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] font-medium tracking-[-0.01em] text-ink group-hover:text-pricing-blue transition-colors">
              {t(labelKey)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

