import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { HOME_NAV_ITEM } from '../model/navConfig';
import { useSidebarStore } from '../model/sidebar.store';
import { useVisibleNav } from '../lib/useVisibleNav';
import { findActiveItem } from '../lib/findActiveItem';
import { SidebarItem } from './SidebarItem';
import { SidebarGroup } from './SidebarGroup';

export { SidebarItem } from './SidebarItem';

interface SidebarNavListProps {
  onNavigate?: () => void;
  isShrunk?: boolean;
}

/** Grouped nav list supporting both full and compact icon-only rail modes. */
export function SidebarNavList({ onNavigate, isShrunk }: SidebarNavListProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const visibleGroups = useVisibleNav();
  const activeMatch = findActiveItem(visibleGroups, pathname);

  return (
    <nav aria-label={t('nav.main')} className={cn('space-y-1.5', isShrunk && 'space-y-1')}>
      <SidebarItem
        to={HOME_NAV_ITEM.to}
        icon={HOME_NAV_ITEM.icon}
        label={t(HOME_NAV_ITEM.labelKey)}
        isActive={activeMatch?.item.to === HOME_NAV_ITEM.to}
        onClick={onNavigate}
        isShrunk={isShrunk}
      />
      {visibleGroups.map((group) => (
        <SidebarGroup
          key={group.key}
          group={group}
          activeItemTo={activeMatch?.item.to ?? null}
          isGroupActive={activeMatch?.groupKey === group.key}
          onNavigate={onNavigate}
          isShrunk={isShrunk}
        />
      ))}
    </nav>
  );
}

/** Apple-styled responsive sidebar supporting expansion and compact shrunk state. */
export function AppSidebar() {
  const { t } = useTranslation();
  const isShrunk = useSidebarStore((s) => s.isShrunk);
  const toggleShrunk = useSidebarStore((s) => s.toggleShrunk);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggleShrunk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleShrunk]);

  return (
    <aside
      className={cn(
        'hidden lg:flex shrink-0 border-r border-hairline-silver/70 bg-gallery-white sticky top-14 h-[calc(100vh-3.5rem)] flex-col justify-between transition-[width] duration-200 ease-in-out',
        isShrunk ? 'w-[68px]' : 'w-64',
      )}
    >
      <div className={cn('flex-1 min-h-0 overflow-y-auto overflow-x-hidden', isShrunk ? 'p-2' : 'p-4')}>
        <SidebarNavList isShrunk={isShrunk} />
      </div>
      <div className="shrink-0 p-2 border-t border-hairline-silver/60">
        <Button
          type="button"
          variant="ghost"
          size={isShrunk ? 'icon' : 'sm'}
          onClick={toggleShrunk}
          className={cn(
            'text-slate hover:text-ink hover:bg-control-gray/50 transition-colors cursor-pointer',
            isShrunk
              ? 'h-9 w-9 mx-auto flex items-center justify-center rounded-xl'
              : 'w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl',
          )}
          title={isShrunk ? t('nav.expandSidebar') : t('nav.shrinkSidebar')}
          aria-label={isShrunk ? t('nav.expandSidebar') : t('nav.shrinkSidebar')}
        >
          {isShrunk ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <span className="text-[11px] font-medium tracking-tight">BLACKSTORE ERP</span>
              <PanelLeftClose className="h-4 w-4 text-slate shrink-0" />
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
