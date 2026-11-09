import type { LucideIcon } from 'lucide-react';
import {
  Home, ShoppingCart, Receipt, Contact, Handshake,
  Smartphone, Headphones, ArrowLeftRight, ClipboardCheck,
  Package, HandCoins, Building2, Upload,
  CalendarCheck, Wallet, BarChart3, Coins,
  Users, MapPin, Shapes, Settings, DatabaseBackup, ScrollText,
  Send, Trash2, Radar, BellRing,
} from 'lucide-react';
import type { Permission } from '@/shared/config/permissions';

export interface NavItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  labelKey: string;
  permission?: Permission;
  activePrefixes?: string[];
  destructive?: boolean;
}

export interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

/** Home item: always visible, placed outside the collapsible groups. */
export const HOME_NAV_ITEM: NavItem = {
  to: '/',
  end: true,
  icon: Home,
  labelKey: 'nav.home',
};

/** All 6 navigation groups in operational shop order: sell → stock → buy → finance → settings → superAdmin. */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'sales',
    labelKey: 'nav.groups.sales',
    items: [
      { to: '/sell', labelKey: 'nav.sell', icon: ShoppingCart, permission: 'sell' },
      { to: '/sales', labelKey: 'nav.sales', icon: Receipt, permission: 'sell' },
      { to: '/customers', labelKey: 'nav.customers', icon: Contact, permission: 'sell' },
      {
        to: '/partners',
        labelKey: 'nav.partners',
        icon: Handshake,
        permission: 'consign',
        activePrefixes: ['/consignments'],
      },
    ],
  },
  {
    key: 'stock',
    labelKey: 'nav.groups.stock',
    items: [
      { to: '/items', labelKey: 'nav.items', icon: Smartphone, permission: 'view_stock' },
      { to: '/accessories', labelKey: 'nav.accessories', icon: Headphones, permission: 'view_stock' },
      { to: '/transfers', labelKey: 'nav.transfers', icon: ArrowLeftRight, permission: 'view_stock' },
      { to: '/stock-counts', labelKey: 'nav.stockCount', icon: ClipboardCheck, permission: 'stock_count' },
    ],
  },
  {
    key: 'purchasing',
    labelKey: 'nav.groups.purchasing',
    items: [
      { to: '/batches', labelKey: 'nav.batches', icon: Package, permission: 'receive_batch' },
      { to: '/purchases/walk-in', labelKey: 'nav.walkInPurchase', icon: HandCoins, permission: 'buy_walk_in' },
      { to: '/suppliers', labelKey: 'nav.suppliers', icon: Building2, permission: 'manage_suppliers' },
      { to: '/items/import', labelKey: 'nav.importStock', icon: Upload, permission: 'manage_prices' },
      { to: '/watches', labelKey: 'nav.watches', icon: Radar, permission: 'manage_watches' },
      { to: '/matches', labelKey: 'nav.matches', icon: BellRing, permission: 'manage_watches' },
    ],
  },
  {
    key: 'finance',
    labelKey: 'nav.groups.finance',
    items: [
      { to: '/close-day', labelKey: 'nav.closeDay', icon: CalendarCheck, permission: 'close_day' },
      { to: '/expenses', labelKey: 'nav.expenses', icon: Wallet, permission: 'manage_expenses' },
      {
        to: '/reports/profit',
        labelKey: 'nav.reports',
        icon: BarChart3,
        permission: 'view_profit',
        activePrefixes: ['/reports'],
      },
      { to: '/investors', labelKey: 'nav.investors', icon: Coins, permission: 'manage_investors' },
    ],
  },
  {
    key: 'settings',
    labelKey: 'nav.groups.settings',
    items: [
      { to: '/users', labelKey: 'nav.users', icon: Users, permission: 'manage_users' },
      { to: '/locations', labelKey: 'nav.locations', icon: MapPin, permission: 'manage_catalog' },
      { to: '/categories', labelKey: 'nav.categories', icon: Shapes, permission: 'manage_catalog' },
      { to: '/settings/receipt', labelKey: 'nav.receiptSettings', icon: Settings, permission: 'manage_catalog' },
      { to: '/backups', labelKey: 'nav.backups', icon: DatabaseBackup, permission: 'manage_backups' },
      { to: '/audit-log', labelKey: 'nav.auditLog', icon: ScrollText, permission: 'view_audit_log' },
    ],
  },
  {
    key: 'superAdmin',
    labelKey: 'nav.groups.superAdmin',
    items: [
      { to: '/super-admin/telegram', labelKey: 'nav.telegram', icon: Send, permission: 'manage_integrations' },
      {
        to: '/super-admin/hard-delete',
        labelKey: 'nav.hardDelete',
        icon: Trash2,
        permission: 'hard_delete',
        destructive: true,
      },
    ],
  },
];
