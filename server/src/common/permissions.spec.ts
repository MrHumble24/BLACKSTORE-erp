import {
  ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  STAFF_PERMISSIONS,
  SUPER_ONLY_PERMISSIONS,
} from './permissions';

// F12: Super Admin holds the super-only powers; Admin holds neither; Staff unchanged.
describe('permission split (F12)', () => {
  it('SuperAdmin (ALL_PERMISSIONS) includes both super-only permissions', () => {
    expect(ALL_PERMISSIONS).toContain('hard_delete');
    expect(ALL_PERMISSIONS).toContain('manage_integrations');
  });

  it('Admin includes neither super-only permission', () => {
    expect(ADMIN_PERMISSIONS).not.toContain('hard_delete');
    expect(ADMIN_PERMISSIONS).not.toContain('manage_integrations');
  });

  it('Admin has every permission except the super-only ones', () => {
    expect(ADMIN_PERMISSIONS).toHaveLength(
      ALL_PERMISSIONS.length - SUPER_ONLY_PERMISSIONS.length,
    );
  });

  it('Staff permissions are unchanged (8, no admin powers)', () => {
    expect(STAFF_PERMISSIONS).toHaveLength(8);
    expect(STAFF_PERMISSIONS).not.toContain('hard_delete');
    expect(STAFF_PERMISSIONS).not.toContain('manage_integrations');
  });
});
