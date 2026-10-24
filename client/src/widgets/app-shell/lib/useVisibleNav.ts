import { useAuthStore } from '@/entities/session';
import { NAV_GROUPS, type NavGroup } from '../model/navConfig';

/**
 * Filters navigation groups by current user permissions.
 * Drops items the user cannot access, and removes groups with no items remaining.
 */
export function useVisibleNav(): NavGroup[] {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const visibleGroups: NavGroup[] = [];

  for (const group of NAV_GROUPS) {
    const items = group.items.filter(
      (item) => !item.permission || hasPermission(item.permission),
    );
    if (items.length > 0) {
      visibleGroups.push({ ...group, items });
    }
  }

  return visibleGroups;
}
