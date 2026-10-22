import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, Users, Smartphone, Headphones, MapPin, Shapes, Coins,
  Building2, Package, ShoppingCart, Receipt, Contact, Settings,
} from 'lucide-react';
import { useAuthStore } from '@/entities/session';
import { cn } from '@/shared/lib';

interface SidebarItemProps {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
}

/** One pill-shaped sidebar navigation link. */
function SidebarItem({ to, end, icon, label }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium tracking-[-0.01em] transition-all duration-150',
          isActive
            ? 'bg-ink text-gallery-white'
            : 'text-slate hover:bg-control-gray/60 hover:text-ink',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/** Selling links (Sell, Sales, Customers), shown to users with the `sell` permission. */
function SellingItems() {
  const { t } = useTranslation();
  const canSell = useAuthStore((state) => state.hasPermission('sell'));
  if (!canSell) return null;
  return (
    <>
      <SidebarItem to="/sell" icon={<ShoppingCart className="h-4 w-4" />} label={t('nav.sell')} />
      <SidebarItem to="/sales" icon={<Receipt className="h-4 w-4" />} label={t('nav.sales')} />
      <SidebarItem to="/customers" icon={<Contact className="h-4 w-4" />} label={t('nav.customers')} />
    </>
  );
}

/** Buying links (Suppliers, Batches, Walk-in purchases), shown by their permissions. */
function BuyingItems() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <>
      {hasPermission('manage_suppliers') && (
        <SidebarItem to="/suppliers" icon={<Building2 className="h-4 w-4" />} label={t('nav.suppliers')} />
      )}
      {hasPermission('receive_batch') && (
        <SidebarItem to="/batches" icon={<Package className="h-4 w-4" />} label={t('nav.batches')} />
      )}
      {hasPermission('buy_walk_in') && (
        <SidebarItem to="/purchases/walk-in" icon={<ShoppingCart className="h-4 w-4" />} label={t('nav.walkInPurchase')} />
      )}
    </>
  );
}

/** Admin links: users, catalog, receipt settings and investors (permission-gated). */
function AdminItems() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <>
      {hasPermission('manage_users') && (
        <SidebarItem to="/users" icon={<Users className="h-4 w-4" />} label={t('nav.users')} />
      )}
      {hasPermission('manage_catalog') && (
        <>
          <SidebarItem to="/locations" icon={<MapPin className="h-4 w-4" />} label={t('nav.locations')} />
          <SidebarItem to="/categories" icon={<Shapes className="h-4 w-4" />} label={t('nav.categories')} />
          <SidebarItem to="/settings/receipt" icon={<Settings className="h-4 w-4" />} label={t('nav.receiptSettings')} />
        </>
      )}
      {hasPermission('manage_investors') && (
        <SidebarItem to="/investors" icon={<Coins className="h-4 w-4" />} label={t('nav.investors')} />
      )}
    </>
  );
}

/** Full nav list: home, selling, stock, buying, admin. */
function SidebarNavList() {
  const { t } = useTranslation();
  const canViewStock = useAuthStore((state) => state.hasPermission('view_stock'));
  return (
    <nav className="space-y-1.5">
      <SidebarItem to="/" end icon={<Home className="h-4 w-4" />} label={t('nav.home')} />
      <SellingItems />
      {canViewStock && (
        <>
          <SidebarItem to="/items" icon={<Smartphone className="h-4 w-4" />} label={t('nav.items')} />
          <SidebarItem to="/accessories" icon={<Headphones className="h-4 w-4" />} label={t('nav.accessories')} />
        </>
      )}
      <BuyingItems />
      <AdminItems />
    </nav>
  );
}

/** Apple-styled sidebar navigation with pill menu items and hairline boundary. */
export function AppSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-hairline-silver/70 bg-gallery-white min-h-[calc(100vh-3.5rem)] p-4 flex flex-col justify-between">
      <SidebarNavList />
      <div className="p-3 text-[11px] text-slate tracking-[-0.01em] text-center border-t border-hairline-silver/60">
        BLACKSTORE
      </div>
    </aside>
  );
}
