import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HOME_NAV_ITEM } from '../model/navConfig';
import { useVisibleNav } from '../lib/useVisibleNav';
import { findActiveItem } from '../lib/findActiveItem';
import { SidebarItem } from './SidebarItem';
import { SidebarGroup } from './SidebarGroup';

export { SidebarItem } from './SidebarItem';

interface SidebarNavListProps {
  onNavigate?: () => void;
}

/** Full grouped nav list: Home + 6 permission-gated collapsible groups. */
export function SidebarNavList({ onNavigate }: SidebarNavListProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const visibleGroups = useVisibleNav();
  const activeMatch = findActiveItem(visibleGroups, pathname);

  return (
    <nav aria-label={t('nav.main')} className="space-y-1.5">
      <SidebarItem
        to={HOME_NAV_ITEM.to}
        icon={HOME_NAV_ITEM.icon}
        label={t(HOME_NAV_ITEM.labelKey)}
        isActive={activeMatch?.item.to === HOME_NAV_ITEM.to}
        onClick={onNavigate}
      />
      {visibleGroups.map((group) => (
        <SidebarGroup
          key={group.key}
          group={group}
          activeItemTo={activeMatch?.item.to ?? null}
          isGroupActive={activeMatch?.groupKey === group.key}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

/** Apple-styled sidebar navigation with grouped collapsible sections and pinned footer. */
export function AppSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-hairline-silver/70 bg-gallery-white sticky top-14 h-[calc(100vh-3.5rem)] flex-col justify-between">
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <SidebarNavList />
      </div>
      <div className="shrink-0 p-3 text-[11px] text-slate tracking-[-0.01em] text-center border-t border-hairline-silver/60">
        BLACKSTORE ERP
      </div>
    </aside>
  );
}
