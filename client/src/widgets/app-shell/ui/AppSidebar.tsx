import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, Users, Smartphone, Headphones, MapPin, Shapes, Coins,
  Building2, Package, ShoppingCart,
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

/** Buying links (Suppliers, Batches, Walk-in purchases), shown by their permissions. */
function ManagementItems() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canReceiveBatch = hasPermission('receive_batch');
  const canBuyWalkIn = hasPermission('buy_walk_in');
  const canManageSuppliers = hasPermission('manage_suppliers');

  return (
    <>
      {canManageSuppliers && (
        <SidebarItem
          to="/suppliers"
          icon={<Building2 className="h-4 w-4" />}
          label={t('nav.suppliers')}
        />
      )}
      {canReceiveBatch && (
        <SidebarItem
          to="/batches"
          icon={<Package className="h-4 w-4" />}
          label={t('nav.batches')}
        />
      )}
      {canBuyWalkIn && (
        <SidebarItem
          to="/purchases/walk-in"
          icon={<ShoppingCart className="h-4 w-4" />}
          label={t('nav.walkInPurchase')}
        />
      )}
    </>
  );
}

/** Core links: home, stock block, users, catalog and investors (permission-gated). */
function MainNavLinks() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManageUsers = hasPermission('manage_users');
  const canViewStock = hasPermission('view_stock');
  const canManageCatalog = hasPermission('manage_catalog');
  const canManageInvestors = hasPermission('manage_investors');

  return (
    <>
      <SidebarItem to="/" end icon={<Home className="h-4 w-4" />} label={t('nav.home')} />
      {canViewStock && (
        <>
          <SidebarItem to="/items" icon={<Smartphone className="h-4 w-4" />} label={t('nav.items')} />
          <SidebarItem
            to="/accessories"
            icon={<Headphones className="h-4 w-4" />}
            label={t('nav.accessories')}
          />
        </>
      )}
      <ManagementItems />
      {canManageUsers && (
        <SidebarItem to="/users" icon={<Users className="h-4 w-4" />} label={t('nav.users')} />
      )}
      {canManageCatalog && (
        <>
          <SidebarItem
            to="/locations"
            icon={<MapPin className="h-4 w-4" />}
            label={t('nav.locations')}
          />
          <SidebarItem
            to="/categories"
            icon={<Shapes className="h-4 w-4" />}
            label={t('nav.categories')}
          />
        </>
      )}
      {canManageInvestors && (
        <SidebarItem
          to="/investors"
          icon={<Coins className="h-4 w-4" />}
          label={t('nav.investors')}
        />
      )}
    </>
  );
}

/** Apple-styled sidebar navigation with pill menu items and hairline boundary. */
export function AppSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-hairline-silver/70 bg-gallery-white min-h-[calc(100vh-3.5rem)] p-4 flex flex-col justify-between">
      <nav className="space-y-1.5">
        <MainNavLinks />
      </nav>
      <div className="p-3 text-[11px] text-slate tracking-[-0.01em] text-center border-t border-hairline-silver/60">
        BLACKSTORE
      </div>
    </aside>
  );
}
