Working tree: main repo, `client/` only (no server change, no route change). Follow `CLAUDE.md`,
`GEMINI.md`/`AGENTS.md`, `.claude/agents/frontend-developer.md` and `docs/rules/frontend.md`.
Do not commit. Run the tool from the project root.

# F20-FE-01 — Grouped sidebar navigation — frontend

## Problem

`client/src/widgets/app-shell/ui/AppSidebar.tsx` renders up to 26 flat pill links in one column.
Nothing separates selling from stock from admin, the order follows feature history rather than the
shop's day, and the same icon is reused for different pages (ShoppingCart for Sell and Walk-in
purchases, Receipt for Sales and Expenses). The mobile drawer (`AppHeader.tsx` → `MobileNavDrawer`)
reuses the same list, so it has the same problem.

## Goal

One data-driven navigation config rendered as **collapsible groups** with short headers, in the
order a shop works: sell → stock → buy → money → settings. Groups a user has no access to disappear
entirely. The group holding the current page is always open. Open/closed state is remembered per
browser. Same component in the desktop sidebar and the mobile drawer. PRD: NFR Usability (fast daily
work, G4), FR-29 (staff never see admin areas), NFR Language (uz/ru/en).

## Groups and order (final; do not add or rename pages)

| # | Group (key) | Items in order (route, permission, icon) |
| --- | --- | --- |
| – | Home (no group, always first, always visible) | `/` `end`, Home |
| 1 | `sales` | Sell `/sell` (sell, ShoppingCart) · Sales `/sales` (sell, Receipt) · Customers `/customers` (sell, Contact) · Partners `/partners` (consign, Handshake) |
| 2 | `stock` | Devices `/items` (view_stock, Smartphone) · Accessories `/accessories` (view_stock, Headphones) · Transfers `/transfers` (view_stock, ArrowLeftRight) · Stock count `/stock-counts` (stock_count, ClipboardCheck) |
| 3 | `purchasing` | Batches `/batches` (receive_batch, Package) · Walk-in purchases `/purchases/walk-in` (buy_walk_in, HandCoins) · Suppliers `/suppliers` (manage_suppliers, Building2) · Stock import `/items/import` (manage_prices, Upload) |
| 4 | `finance` | Close day `/close-day` (close_day, CalendarCheck) · Expenses `/expenses` (manage_expenses, Wallet) · Reports `/reports/profit` (view_profit, BarChart3) · Investors `/investors` (manage_investors, Coins) |
| 5 | `settings` | Users `/users` (manage_users, Users) · Locations `/locations` (manage_catalog, MapPin) · Categories `/categories` (manage_catalog, Shapes) · Receipt settings `/settings/receipt` (manage_catalog, Settings) · Backups `/backups` (manage_backups, DatabaseBackup) · Audit log `/audit-log` (view_audit_log, ScrollText) |
| 6 | `superAdmin` | Telegram `/super-admin/telegram` (manage_integrations, Send) · Danger zone `/super-admin/hard-delete` (hard_delete, Trash2) |

Every icon is unique; `HandCoins` and `Wallet` are new lucide icons (already installed, no new
dependency). Item labels keep the existing `nav.*` keys (the command palette uses them). Group labels
are new keys `nav.groups.sales|stock|purchasing|finance|settings|superAdmin` in uz, ru and en
(en: Sales, Stock, Purchasing, Finance, Settings, Super admin).

## Where

- `client/src/widgets/app-shell/model/navConfig.ts`: `NAV_GROUPS: NavGroup[]` and the Home item.
  ```ts
  interface NavItem { to: string; end?: boolean; icon: LucideIcon; labelKey: string; permission: Permission;
    /** Extra prefixes that count as "inside" this item (see Active page). */ activePrefixes?: string[] }
  interface NavGroup { key: string; labelKey: string; items: NavItem[] }
  ```
  `Permission` comes from `@/shared/config/permissions`. Icons are the lucide components, not JSX.
- `client/src/widgets/app-shell/model/navGroups.store.ts`: Zustand store with `persist`
  (localStorage key `blackstore-nav-groups`, same pattern and dashed naming as
  `features/bulk-add-items/model/bulkAdd.store.ts`):
  `{ collapsed: Record<string, boolean>; toggle(key): void }`. Only **collapsed** keys are stored;
  anything missing is open. Comment why (new groups default open, old keys harmless).
- `client/src/widgets/app-shell/lib/useVisibleNav.ts`: filters `NAV_GROUPS` by
  `useAuthStore(s => s.hasPermission)` (from `@/entities/session`, as the sidebar does today; not
  from `@/features/auth`), drops items the user cannot see and then groups with no items left. It is
  25 items; no memoisation.
- `client/src/widgets/app-shell/ui/AppSidebar.tsx`: keep `SidebarItem` (same pill style) and
  `AppSidebar`; replace the six `*Items` components with `SidebarGroup` and a `SidebarNavList` that
  maps the visible groups. New file `ui/SidebarGroup.tsx` if `AppSidebar.tsx` would pass 300 lines.
- `AppHeader.tsx` / `MobileNavDrawer`: no change except that it keeps calling `SidebarNavList`.
- `features/command-search/model/useCommandItems.ts`: only swap the Walk-in purchases icon to
  `HandCoins` and the Expenses icon to `Wallet` so the palette matches the sidebar. Nothing else.
- Routes and pages: untouched.

## Behaviour

**Group header.** A `<button type="button" aria-expanded aria-controls="nav-group-<key>">` spanning
the row: label in `text-[10px] font-semibold uppercase tracking-[0.08em] text-steel`, a `ChevronDown`
(h-3.5) on the right that rotates 180° when collapsed (`transition-transform`, respects
`motion-reduce:transition-none`). Hover: `text-ink`. Min height 36px on touch screens.
Items sit under the header in the existing `space-y-1.5`, group blocks separated by `mt-4`.

**Collapse.** Clicking the header toggles `collapsed[key]`. When collapsed the item list is not
rendered (not just hidden). Enter and Space work because it is a real button. The header must not
close the mobile drawer (only item clicks call `onNavigate`).

**Active page always reachable.** A group renders open when it is not collapsed **or** it holds
the active item. Derive this during render from `useLocation().pathname`, no effect and no store
write: collapsing the active group is simply ignored until the user leaves it (the chevron shows
open while it holds the current page). One small pure helper `findActiveItem(groups, pathname)` in
`lib/` decides the active item with the rule below; unit-test it with the cases listed.

**Active page rule.** An item *matches* when `pathname === to` or `pathname` starts with `to + '/'`
or with any `activePrefixes` entry. When several items match, the one with the **longest matching
prefix** wins (so `/items/import` lights Stock import, not Devices, with no special case). Home
matches only `/`. Pass the result as a computed `isActive` to the pill (do not rely on `NavLink`'s
own prefix matching, which would light two items). Required mappings:
- Partners: `activePrefixes: ['/consignments']` (`/consignments/new`, `/consignments/:id` live under Partners).
- Reports: `to: '/reports/profit'`, `activePrefixes: ['/reports']` (the investor report tab is `/reports/investors`).
- Devices: `to: '/items'`; `/items/:id` and `/items/bulk-add` light Devices.
- Stock import: `to: '/items/import'` (longest match beats Devices).
- Transfers: `/transfers/new` and `/transfers/:id` light Transfers (prefix rule covers it).
- Nothing lights two items at once; add a test asserting exactly one active item for each of:
  `/`, `/items/42`, `/items/import`, `/items/bulk-add`, `/consignments/new`, `/reports/investors`,
  `/sales/7`, `/purchases/walk-in`, `/super-admin/hard-delete`.

**Permissions.** Use `hasPermission` exactly as today (Admin implicitly holds all non-super powers;
SuperAdmin lists its own). A staff member with the default staff permissions sees Home, Sales (Sell,
Sales, Customers, Partners), Stock (all four), Purchasing (Batches, Walk-in purchases) and nothing
else: no Finance, Settings or Super admin headers at all. A user whose role has only `view_stock`
sees Home and a Stock group with Devices, Accessories, Transfers. Never render an empty group or a
header without items.

**Danger zone** item gets a deliberate new destructive look (today it has none): label and icon
`text-launch-orange` when inactive; the active pill uses the same ink style as the others (no red
pill).

**Persistence edge cases.** Corrupt or non-object localStorage value → treat as empty (zustand
`persist` with a `merge` that validates `typeof collapsed === 'object'`). Keys for groups that no
longer exist are ignored. Logging out does not clear it (it is only layout preference). Two tabs:
last write wins, acceptable.

**Sidebar height.** With all groups open the list is taller than a 13-inch laptop viewport. Make
the `<aside>` `sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto` with the nav in a scrolling
`flex-1` block and the "BLACKSTORE ERP" footer pinned at the bottom (`shrink-0`). Hide the
scrollbar track visually only if Tailwind can do it without a plugin; otherwise leave the default.
The mobile drawer already scrolls its middle block; keep that.

**Mobile drawer.** Same `SidebarNavList`; group toggles work by touch; tapping an item closes the
drawer as today; the drawer's header, language, theme and logout controls are unchanged.

**Language switch.** Labels re-render on language change because they are `t()` calls inside the
render, not strings captured in the config (config holds `labelKey` only).

**Keyboard and screen readers.** `nav` has `aria-label={t('nav.main')}` (new key, en "Main
navigation"). Group list is a `<ul>` with `<li>` per item; header button `aria-expanded` reflects
state; active link has `aria-current="page"` (NavLink does this automatically, keep it when you
compute `isActive` yourself by passing `aria-current` explicitly).

**Do not build.** No icon-only collapsed sidebar, no drag reordering, no badges or counts, no
"expand all / collapse all", no search inside the sidebar, no animation library.

## Done when

- `npm run build` and `npm run lint` pass in `client/`; every file ≤ 300 lines, every function ≤ 50.
- Unit tests for `findActiveItem` pass. `client/` has no test runner today: add `vitest` as a dev
  dependency with a `test` script (reason: the project rules require a check for non-trivial logic,
  Vite projects pair with vitest, and nothing installed can run a test). One test file next to the
  helper; no other tests, no coverage setup.
- In the browser, logged in as Admin: six group headers plus Home in the order above, each icon
  unique; collapsing Finance and reloading keeps it collapsed; opening `/reports/investors` via the
  Reports tab re-opens Finance and lights Reports only; `/items/import` lights Stock import only;
  `/items/bulk-add` lights Devices only; collapsing the group of the current page keeps it open
  until you navigate elsewhere; the sidebar scrolls on a 700px-tall window with the footer
  pinned; the drawer at 390px wide shows the same groups and closes on item tap but not on header tap.
- Logged in as a staff user: no Finance, Settings or Super admin headers.
- Nothing else in the app changed (command palette, routes, pages).
