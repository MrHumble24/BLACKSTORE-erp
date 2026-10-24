import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib';
import type { NavGroup } from '../model/navConfig';
import { useNavGroupsStore } from '../model/navGroups.store';
import { SidebarItem } from './SidebarItem';

interface SidebarGroupProps {
  group: NavGroup;
  activeItemTo: string | null;
  isGroupActive: boolean;
  onNavigate?: () => void;
  isShrunk?: boolean;
}

/** Collapsible navigation group with accessible header button and Chevron animation. */
export function SidebarGroup({
  group,
  activeItemTo,
  isGroupActive,
  onNavigate,
  isShrunk,
}: SidebarGroupProps) {
  const { t } = useTranslation();
  const isCollapsed = useNavGroupsStore((s) => Boolean(s.collapsed[group.key]));
  const toggle = useNavGroupsStore((s) => s.toggle);

  if (isShrunk) {
    return (
      <div className="mt-2.5 pt-2 border-t border-hairline-silver/60" title={t(group.labelKey)}>
        <ul id={`nav-group-${group.key}`} className="space-y-1">
          {group.items.map((item) => (
            <li key={item.to}>
              <SidebarItem
                to={item.to}
                icon={item.icon}
                label={t(item.labelKey)}
                isActive={activeItemTo === item.to}
                destructive={item.destructive}
                onClick={onNavigate}
                isShrunk
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Group remains open if not collapsed, or if it holds the currently active page.
  const isOpen = !isCollapsed || isGroupActive;

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`nav-group-${group.key}`}
        onClick={() => toggle(group.key)}
        className="flex min-h-[36px] w-full items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-steel hover:text-ink transition-colors cursor-pointer select-none"
      >
        <span>{t(group.labelKey)}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate/70 transition-transform duration-150 motion-reduce:transition-none',
            !isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <ul id={`nav-group-${group.key}`} className="mt-1 space-y-1.5">
          {group.items.map((item) => (
            <li key={item.to}>
              <SidebarItem
                to={item.to}
                icon={item.icon}
                label={t(item.labelKey)}
                isActive={activeItemTo === item.to}
                destructive={item.destructive}
                onClick={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
