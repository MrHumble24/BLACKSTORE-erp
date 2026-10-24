import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Home, Users, Smartphone, Headphones, MapPin, Shapes, Coins,
  Building2, Package, ShoppingCart, Receipt, Contact, Settings,
  ArrowLeftRight, ClipboardCheck, ScrollText, Handshake, BarChart3,
  Upload, DatabaseBackup, Moon, Sun, Search, Barcode, CalendarCheck,
} from 'lucide-react';
import { useAuthStore } from '@/entities/session';
import { useItemByCode } from '@/entities/item';
import { useThemeStore } from '@/features/theme';
import { getApiErrorStatus } from '@/shared/api';
import type { Permission } from '@/shared/config/permissions';
import type { CommandItem } from './types';

interface ItemBuilderArgs {
  t: (key: string) => string;
  navigate: (to: string) => void;
  hasPermission: (perm: Permission) => boolean;
  toggleTheme: () => void;
  resolvedTheme: string;
  close: () => void;
  lookupItem: (code: string) => void;
  query: string;
}


function getCorePages(args: ItemBuilderArgs): CommandItem[] {
  const { t, navigate, hasPermission, close } = args;
  const pages: CommandItem[] = [
    {
      id: 'page-home',
      title: t('nav.home'),
      category: 'pages',
      icon: Home,
      keywords: ['bosh', 'asosiy', 'dashboard', 'main'],
      perform: () => { navigate('/'); close(); },
    },
  ];

  if (hasPermission('sell')) {
    pages.push(
      { id: 'page-sell', title: t('nav.sell'), category: 'pages', icon: ShoppingCart, keywords: ['pos', 'savdo', 'kassa'], perform: () => { navigate('/sell'); close(); } },
      { id: 'page-sales', title: t('nav.sales'), category: 'pages', icon: Receipt, keywords: ['tarix', 'cheklar', 'history'], perform: () => { navigate('/sales'); close(); } },
      { id: 'page-customers', title: t('nav.customers'), category: 'pages', icon: Contact, keywords: ['mijoz', 'qarz', 'debts'], perform: () => { navigate('/customers'); close(); } },
    );
  }
  if (hasPermission('consign')) {
    pages.push({ id: 'page-partners', title: t('nav.partners'), category: 'pages', icon: Handshake, keywords: ['hamkor', 'do\'kon'], perform: () => { navigate('/partners'); close(); } });
  }
  if (hasPermission('view_stock')) {
    pages.push(
      { id: 'page-items', title: t('nav.items'), category: 'pages', icon: Smartphone, keywords: ['qurilma', 'telefon', 'tovar', 'device'], perform: () => { navigate('/items'); close(); } },
      { id: 'page-accessories', title: t('nav.accessories'), category: 'pages', icon: Headphones, keywords: ['chexol', 'kabel', 'aksessuar'], perform: () => { navigate('/accessories'); close(); } },
      { id: 'page-transfers', title: t('nav.transfers'), category: 'pages', icon: ArrowLeftRight, keywords: ['kochirish', 'otkazma'], perform: () => { navigate('/transfers'); close(); } },
    );
  }
  return pages;
}

function getManagementPages(args: ItemBuilderArgs): CommandItem[] {
  const { t, navigate, hasPermission, close } = args;
  const pages: CommandItem[] = [];

  if (hasPermission('manage_suppliers')) {
    pages.push({ id: 'page-suppliers', title: t('nav.suppliers'), category: 'pages', icon: Building2, keywords: ['taminotchi', 'provider'], perform: () => { navigate('/suppliers'); close(); } });
  }
  if (hasPermission('receive_batch')) {
    pages.push({ id: 'page-batches', title: t('nav.batches'), category: 'pages', icon: Package, keywords: ['partiya', 'qabul'], perform: () => { navigate('/batches'); close(); } });
  }
  if (hasPermission('buy_walk_in')) {
    pages.push({ id: 'page-walk-in', title: t('nav.walkInPurchase'), category: 'pages', icon: ShoppingCart, keywords: ['qoldan', 'sotib'], perform: () => { navigate('/purchases/walk-in'); close(); } });
  }
  if (hasPermission('stock_count')) {
    pages.push({ id: 'page-stock-count', title: t('nav.stockCount'), category: 'pages', icon: ClipboardCheck, keywords: ['reviziya', 'sanash'], perform: () => { navigate('/stock-counts'); close(); } });
  }
  if (hasPermission('manage_expenses')) {
    pages.push({ id: 'page-expenses', title: t('nav.expenses'), category: 'pages', icon: Receipt, keywords: ['xarajat', 'chiqim'], perform: () => { navigate('/expenses'); close(); } });
  }
  if (hasPermission('close_day')) {
    pages.push({ id: 'page-close-day', title: t('nav.closeDay'), category: 'pages', icon: CalendarCheck, keywords: ['kassa', 'yopish', 'hisob', 'close', 'reconcile'], perform: () => { navigate('/close-day'); close(); } });
  }
  if (hasPermission('view_audit_log')) {
    pages.push({ id: 'page-audit-log', title: t('nav.auditLog'), category: 'pages', icon: ScrollText, keywords: ['tarix', 'amallar', 'log'], perform: () => { navigate('/audit-log'); close(); } });
  }
  return pages;
}

function getAdminPages(args: ItemBuilderArgs): CommandItem[] {
  const { t, navigate, hasPermission, close } = args;
  const pages: CommandItem[] = [];

  if (hasPermission('manage_users')) {
    pages.push({ id: 'page-users', title: t('nav.users'), category: 'pages', icon: Users, keywords: ['xodim', 'staff', 'admin'], perform: () => { navigate('/users'); close(); } });
  }
  if (hasPermission('manage_catalog')) {
    pages.push(
      { id: 'page-locations', title: t('nav.locations'), category: 'pages', icon: MapPin, keywords: ['ombor', 'filial'], perform: () => { navigate('/locations'); close(); } },
      { id: 'page-categories', title: t('nav.categories'), category: 'pages', icon: Shapes, keywords: ['model', 'toifa'], perform: () => { navigate('/categories'); close(); } },
      { id: 'page-receipt-settings', title: t('nav.receiptSettings'), category: 'pages', icon: Settings, keywords: ['printer', 'chek'], perform: () => { navigate('/settings/receipt'); close(); } },
    );
  }
  if (hasPermission('manage_investors')) {
    pages.push({ id: 'page-investors', title: t('nav.investors'), category: 'pages', icon: Coins, keywords: ['investitsiya', 'ulush'], perform: () => { navigate('/investors'); close(); } });
  }
  if (hasPermission('view_profit')) {
    pages.push({ id: 'page-reports', title: t('nav.reports'), category: 'pages', icon: BarChart3, keywords: ['daromad', 'foyda', 'profit'], perform: () => { navigate('/reports/profit'); close(); } });
  }
  if (hasPermission('manage_prices')) {
    pages.push({ id: 'page-import', title: t('nav.importStock'), category: 'pages', icon: Upload, keywords: ['excel', 'fayl'], perform: () => { navigate('/items/import'); close(); } });
  }
  if (hasPermission('manage_backups')) {
    pages.push({ id: 'page-backups', title: t('nav.backups'), category: 'pages', icon: DatabaseBackup, keywords: ['arxiv', 'baza'], perform: () => { navigate('/backups'); close(); } });
  }
  return pages;
}

function buildNavigationPages(args: ItemBuilderArgs): CommandItem[] {
  return [
    ...getCorePages(args),
    ...getManagementPages(args),
    ...getAdminPages(args),
  ];
}


function buildQuickActions({ t, navigate, hasPermission, toggleTheme, resolvedTheme, close }: ItemBuilderArgs): CommandItem[] {
  const actions: CommandItem[] = [
    {
      id: 'action-theme',
      title: t('command.toggleTheme'),
      subtitle: resolvedTheme === 'dark' ? t('common.lightTheme') : t('common.darkTheme'),
      category: 'actions',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      keywords: ['theme', 'mavzu', 'dark', 'light'],
      perform: () => { toggleTheme(); close(); },
    },
  ];

  if (hasPermission('sell')) {
    actions.push({ id: 'action-sell', title: t('command.newSale'), category: 'actions', icon: ShoppingCart, perform: () => { navigate('/sell'); close(); } });
  }
  if (hasPermission('receive_batch')) {
    actions.push({ id: 'action-batch', title: t('command.receiveBatch'), category: 'actions', icon: Package, perform: () => { navigate('/batches'); close(); } });
  }
  if (hasPermission('buy_walk_in')) {
    actions.push({ id: 'action-walk-in', title: t('command.walkInPurchase'), category: 'actions', icon: ShoppingCart, perform: () => { navigate('/purchases/walk-in'); close(); } });
  }
  if (hasPermission('manage_expenses')) {
    actions.push({ id: 'action-expense', title: t('command.newExpense'), category: 'actions', icon: Receipt, perform: () => { navigate('/expenses'); close(); } });
  }
  if (hasPermission('stock_count')) {
    actions.push({ id: 'action-stock-count', title: t('command.startStockCount'), category: 'actions', icon: ClipboardCheck, perform: () => { navigate('/stock-counts'); close(); } });
  }

  return actions;
}

function buildLookupItems({ t, navigate, hasPermission, lookupItem, query, close }: ItemBuilderArgs): CommandItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const lookups: CommandItem[] = [];

  if (hasPermission('view_stock')) {
    lookups.push({
      id: 'lookup-code',
      title: `${t('command.lookupItem')}: "${trimmed}"`,
      subtitle: 'IMEI / Serial / Barcode',
      category: 'lookup',
      icon: Barcode,
      perform: () => lookupItem(trimmed),
    });
    lookups.push({
      id: 'lookup-items',
      title: `${t('command.searchItems')}: "${trimmed}"`,
      category: 'lookup',
      icon: Search,
      perform: () => { navigate(`/items?search=${encodeURIComponent(trimmed)}`); close(); },
    });
    lookups.push({
      id: 'lookup-accessories',
      title: `${t('command.searchAccessories')}: "${trimmed}"`,
      category: 'lookup',
      icon: Search,
      perform: () => { navigate(`/accessories?search=${encodeURIComponent(trimmed)}`); close(); },
    });
  }

  return lookups;
}

function matchesSearch(item: CommandItem, term: string): boolean {
  const cleanTerm = term.toLowerCase().trim();
  if (!cleanTerm) return true;
  if (item.title.toLowerCase().includes(cleanTerm)) return true;
  if (item.subtitle?.toLowerCase().includes(cleanTerm)) return true;
  return Boolean(item.keywords?.some((k) => k.toLowerCase().includes(cleanTerm)));
}

/** Hook producing filtered command items for the palette. */
export function useCommandItems(query: string, close: () => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const { mutate: runLookup, isPending: isLookingUp } = useItemByCode();

  const handleLookup = (code: string) => {
    runLookup(code, {
      onSuccess: (item) => {
        close();
        navigate(`/items/${item.id}`);
      },
      onError: (err) => {
        toast.error(getApiErrorStatus(err) === 404 ? t('scan.notFound') : t('common.error'));
      },
    });
  };

  const args: ItemBuilderArgs = {
    t,
    navigate,
    hasPermission,
    toggleTheme,
    resolvedTheme,
    close,
    lookupItem: handleLookup,
    query,
  };

  const lookupItems = buildLookupItems(args);
  const rawActions = buildQuickActions(args);
  const actionItems = query ? rawActions.filter((item) => matchesSearch(item, query)) : rawActions;
  const rawPages = buildNavigationPages(args);
  const pageItems = query ? rawPages.filter((item) => matchesSearch(item, query)) : rawPages;

  return {
    lookupItems,
    actionItems,
    pageItems,
    isLookingUp,
    allItems: [...lookupItems, ...actionItems, ...pageItems],
  };
}

