import { HOME_NAV_ITEM, type NavGroup, type NavItem } from '../model/navConfig';

export interface ActiveNavMatch {
  item: NavItem;
  groupKey: string | null;
}

/** Returns the matching prefix length if pathname equals target or is a sub-path of target. */
function matchScore(pathname: string, target: string): number {
  if (pathname === target) return target.length;
  const prefix = target.endsWith('/') ? target : `${target}/`;
  if (pathname.startsWith(prefix)) return target.length;
  return 0;
}

/**
 * Finds the single active navigation item for a given URL path.
 * When multiple items match (e.g. `/items/import` matches both Devices `/items` and Stock import `/items/import`),
 * the one with the longest matching prefix wins. Home matches only `/`.
 */
export function findActiveItem(
  groups: NavGroup[],
  pathname: string,
  homeItem: NavItem = HOME_NAV_ITEM,
): ActiveNavMatch | null {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (path === '/') {
    return { item: homeItem, groupKey: null };
  }

  let bestMatch: ActiveNavMatch | null = null;
  let bestScore = 0;

  for (const group of groups) {
    for (const item of group.items) {
      let score = matchScore(path, item.to);
      if (item.activePrefixes) {
        for (const prefix of item.activePrefixes) {
          const s = matchScore(path, prefix);
          if (s > score) score = s;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { item, groupKey: group.key };
      }
    }
  }

  return bestMatch;
}
