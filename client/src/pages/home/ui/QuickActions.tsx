import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingCart, PackagePlus, HandCoins, Search } from 'lucide-react';
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
}

/** Primary operational shortcuts; each gated by the route's own permission. */
const ACTIONS: QuickAction[] = [
  { to: '/sell', labelKey: 'home.actions.newSale', icon: ShoppingCart, permission: 'sell', accent: 'text-apple-blue' },
  { to: '/batches', labelKey: 'home.actions.receiveBatch', icon: PackagePlus, permission: 'receive_batch', accent: 'text-emerald-600 dark:text-emerald-400' },
  { to: '/purchases/walk-in', labelKey: 'home.actions.walkIn', icon: HandCoins, permission: 'buy_walk_in', accent: 'text-launch-orange' },
  { to: '/items', labelKey: 'home.actions.findItem', icon: Search, permission: 'view_stock', accent: 'text-purple-600 dark:text-purple-400' },
];

/** Large tappable quick-action buttons, showing only those the user may use. */
export function QuickActions() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visible = ACTIONS.filter((a) => hasPermission(a.permission));
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {visible.map(({ to, labelKey, icon: Icon, accent }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            CARD,
            'flex flex-col items-start gap-3 p-4 transition-transform hover:-translate-y-0.5 active:translate-y-0',
          )}
        >
          <Icon className={cn('h-6 w-6', accent)} />
          <span className="text-[13px] font-medium tracking-[-0.01em] text-ink">{t(labelKey)}</span>
        </Link>
      ))}
    </div>
  );
}
