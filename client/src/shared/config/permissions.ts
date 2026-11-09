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
  'manage_backups',
  'close_day',
  'manage_watches',
] as const;

// Super-admin-only powers (F12). Admin never implicitly gets these; only the SuperAdmin role,
// whose role.permissions explicitly lists them, does.
export const SUPER_ONLY_PERMISSIONS = ['manage_integrations', 'hard_delete'] as const;

export const ALL_PERMISSIONS = [
  ...STAFF_PERMISSIONS,
  ...ADMIN_ONLY_PERMISSIONS,
  ...SUPER_ONLY_PERMISSIONS,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
