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
  'view_audit_log',
  'manage_backups',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

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

/** True when the logged-in user's role grants the permission. */
export function hasPermission(user: PublicUser, permission: Permission): boolean {
  return user.role.permissions.includes(permission);
}
