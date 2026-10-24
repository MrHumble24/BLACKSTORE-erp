import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, Users, Smartphone, Headphones, MapPin, Shapes, Coins,
  Building2, Package, ShoppingCart, Receipt, Contact, Settings,
  ArrowLeftRight, ClipboardCheck, ScrollText, Handshake, BarChart3, Upload, DatabaseBackup,
} from 'lucide-react';
import { useAuthStore } from '@/entities/session';
import { cn } from '@/shared/lib';

interface SidebarItemProps {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

/** One pill-shaped sidebar navigation link. */
function SidebarItem({ to, end, icon, label, onClick }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium tracking-[-0.01em] transition-all duration-150',
          isActive
            ? 'bg-ink text-white dark:bg-control-gray dark:text-ink shadow-xs'
            : 'text-slate hover:bg-control-gray/60 hover:text-ink',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/** Selling links (Sell, Sales, Customers, Partners), shown by permission. */
function SellingItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canSell = hasPermission('sell');
  const canConsign = hasPermission('consign');
  if (!canSell && !canConsign) return null;
  return (
    <>
      {canSell && (
        <>
          <SidebarItem to="/sell" onClick={onNavigate} icon={<ShoppingCart className="h-4 w-4" />} label={t('nav.sell')} />
          <SidebarItem to="/sales" onClick={onNavigate} icon={<Receipt className="h-4 w-4" />} label={t('nav.sales')} />
          <SidebarItem to="/customers" onClick={onNavigate} icon={<Contact className="h-4 w-4" />} label={t('nav.customers')} />
        </>
      )}
      {canConsign && (
        <SidebarItem to="/partners" onClick={onNavigate} icon={<Handshake className="h-4 w-4" />} label={t('nav.partners')} />
      )}
    </>
  );
}

/** Buying links (Suppliers, Batches, Walk-in purchases), shown by their permissions. */
function BuyingItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <>
      {hasPermission('manage_suppliers') && (
        <SidebarItem to="/suppliers" onClick={onNavigate} icon={<Building2 className="h-4 w-4" />} label={t('nav.suppliers')} />
      )}
      {hasPermission('receive_batch') && (
        <SidebarItem to="/batches" onClick={onNavigate} icon={<Package className="h-4 w-4" />} label={t('nav.batches')} />
      )}
      {hasPermission('buy_walk_in') && (
        <SidebarItem to="/purchases/walk-in" onClick={onNavigate} icon={<ShoppingCart className="h-4 w-4" />} label={t('nav.walkInPurchase')} />
      )}
    </>
  );
}

/** Operations links (Transfers, Stock count, Expenses, Audit log), shown by their permissions. */
function OperationsItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <>
      {hasPermission('view_stock') && (
        <SidebarItem to="/transfers" onClick={onNavigate} icon={<ArrowLeftRight className="h-4 w-4" />} label={t('nav.transfers')} />
      )}
      {hasPermission('stock_count') && (
        <SidebarItem to="/stock-counts" onClick={onNavigate} icon={<ClipboardCheck className="h-4 w-4" />} label={t('nav.stockCount')} />
      )}
      {hasPermission('manage_expenses') && (
        <SidebarItem to="/expenses" onClick={onNavigate} icon={<Receipt className="h-4 w-4" />} label={t('nav.expenses')} />
      )}
      {hasPermission('view_audit_log') && (
        <SidebarItem to="/audit-log" onClick={onNavigate} icon={<ScrollText className="h-4 w-4" />} label={t('nav.auditLog')} />
      )}
    </>
  );
}

/** Admin links: users, catalog, receipt settings and investors (permission-gated). */
function AdminItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <>
      {hasPermission('manage_users') && (
        <SidebarItem to="/users" onClick={onNavigate} icon={<Users className="h-4 w-4" />} label={t('nav.users')} />
      )}
      {hasPermission('manage_catalog') && (
        <>
          <SidebarItem to="/locations" onClick={onNavigate} icon={<MapPin className="h-4 w-4" />} label={t('nav.locations')} />
          <SidebarItem to="/categories" onClick={onNavigate} icon={<Shapes className="h-4 w-4" />} label={t('nav.categories')} />
          <SidebarItem to="/settings/receipt" onClick={onNavigate} icon={<Settings className="h-4 w-4" />} label={t('nav.receiptSettings')} />
        </>
      )}
      {hasPermission('manage_investors') && (
        <SidebarItem to="/investors" onClick={onNavigate} icon={<Coins className="h-4 w-4" />} label={t('nav.investors')} />
      )}
      {hasPermission('view_profit') && (
        <SidebarItem to="/reports/profit" onClick={onNavigate} icon={<BarChart3 className="h-4 w-4" />} label={t('nav.reports')} />
      )}
      {hasPermission('manage_prices') && (
        <SidebarItem to="/items/import" onClick={onNavigate} icon={<Upload className="h-4 w-4" />} label={t('nav.importStock')} />
      )}
      {hasPermission('manage_backups') && (
        <SidebarItem to="/backups" onClick={onNavigate} icon={<DatabaseBackup className="h-4 w-4" />} label={t('nav.backups')} />
      )}
    </>
  );
}

/** Full nav list: home, selling, stock, buying, admin. */
export function SidebarNavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const canViewStock = useAuthStore((state) => state.hasPermission('view_stock'));
  return (
    <nav className="space-y-1.5">
      <SidebarItem to="/" end onClick={onNavigate} icon={<Home className="h-4 w-4" />} label={t('nav.home')} />
      <SellingItems onNavigate={onNavigate} />
      {canViewStock && (
        <>
          <SidebarItem to="/items" onClick={onNavigate} icon={<Smartphone className="h-4 w-4" />} label={t('nav.items')} />
          <SidebarItem to="/accessories" onClick={onNavigate} icon={<Headphones className="h-4 w-4" />} label={t('nav.accessories')} />
        </>
      )}
      <BuyingItems onNavigate={onNavigate} />
      <OperationsItems onNavigate={onNavigate} />
      <AdminItems onNavigate={onNavigate} />
    </nav>
  );
}

/** Apple-styled sidebar navigation with pill menu items and hairline boundary. */
export function AppSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-hairline-silver/70 bg-gallery-white min-h-[calc(100vh-3.5rem)] p-4 flex-col justify-between">
      <SidebarNavList />
      <div className="p-3 text-[11px] text-slate tracking-[-0.01em] text-center border-t border-hairline-silver/60">
        BLACKSTORE ERP
      </div>
    </aside>
  );
}
