export const STAFF_PERMISSIONS = [
  'sell',
  'transfer_stock',
  'receive_batch',
  'record_payment',
  'buy_walk_in',
  'consign',
  'stock_count',
  'view_stock',
] as const;

export const ADMIN_ONLY_PERMISSIONS = [
  'view_cost',
  'view_profit',
  'delete_records',
  'edit_past_records',
  'manage_users',
  'manage_prices',
  'manage_investors',
  'manage_suppliers',
  'manage_expenses',
  'manage_catalog',
  'view_audit_log',
] as const;

export const ALL_PERMISSIONS = [
  ...STAFF_PERMISSIONS,
  ...ADMIN_ONLY_PERMISSIONS,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
