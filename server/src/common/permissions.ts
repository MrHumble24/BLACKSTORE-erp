import type { PublicUser } from './auth-user';

/** Single source of truth for permission names (PRD FR-29). Admin has all of them. */
export const ALL_PERMISSIONS = [
  'sell',
  'transfer_stock',
  'receive_batch',
  'record_payment',
  'buy_walk_in',
  'consign',
  'stock_count',
  'view_stock',
  'view_cost',
  'view_profit',
  'delete_records',
  'edit_past_records',
  'manage_users',
  'manage_prices',
  'manage_catalog',
  'manage_investors',
  'manage_suppliers',
  'manage_expenses',
  'close_day', // F13: owner-only daily close / reconciliation (Admin + SuperAdmin, never Staff)
  'view_audit_log',
  'manage_backups',
  // Super-admin-only (F12): guarded by later tasks. Admin never gets these.
  'hard_delete',
  'manage_integrations',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/** Permissions exclusive to Super Admin; Admin is ALL_PERMISSIONS without these (F12). */
export const SUPER_ONLY_PERMISSIONS: Permission[] = [
  'hard_delete',
  'manage_integrations',
];

/** Admin gets everything except the super-only powers, so re-seeding never grants them. */
export const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => !SUPER_ONLY_PERMISSIONS.includes(p),
);

export const STAFF_PERMISSIONS: Permission[] = [
  'sell',
  'transfer_stock',
  'receive_batch',
  'record_payment',
  'buy_walk_in',
  'consign',
  'stock_count',
  'view_stock',
];

export const ADMIN_ROLE = 'Admin';
export const STAFF_ROLE = 'Staff';
export const SUPER_ADMIN_ROLE = 'SuperAdmin';

/** True when the logged-in user's role grants the permission. */
export function hasPermission(user: PublicUser, permission: Permission): boolean {
  return user.role.permissions.includes(permission);
}
