import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from '../model/navConfig';
import { findActiveItem } from './findActiveItem';

describe('findActiveItem', () => {
  it('matches Home only on exact /', () => {
    const match = findActiveItem(NAV_GROUPS, '/');
    expect(match?.item.to).toBe('/');
    expect(match?.groupKey).toBeNull();
  });

  it('lights Devices for item detail subpath /items/42', () => {
    const match = findActiveItem(NAV_GROUPS, '/items/42');
    expect(match?.item.to).toBe('/items');
    expect(match?.groupKey).toBe('stock');
  });

  it('lights Stock import over Devices for /items/import via longest prefix match', () => {
    const match = findActiveItem(NAV_GROUPS, '/items/import');
    expect(match?.item.to).toBe('/items/import');
    expect(match?.groupKey).toBe('purchasing');
  });

  it('lights Devices for bulk add subpath /items/bulk-add', () => {
    const match = findActiveItem(NAV_GROUPS, '/items/bulk-add');
    expect(match?.item.to).toBe('/items');
    expect(match?.groupKey).toBe('stock');
  });

  it('lights Partners for consignment subpath /consignments/new via activePrefixes', () => {
    const match = findActiveItem(NAV_GROUPS, '/consignments/new');
    expect(match?.item.to).toBe('/partners');
    expect(match?.groupKey).toBe('sales');
  });

  it('lights Reports for /reports/investors via activePrefixes', () => {
    const match = findActiveItem(NAV_GROUPS, '/reports/investors');
    expect(match?.item.to).toBe('/reports/profit');
    expect(match?.groupKey).toBe('finance');
  });

  it('lights Sales for sale detail subpath /sales/7', () => {
    const match = findActiveItem(NAV_GROUPS, '/sales/7');
    expect(match?.item.to).toBe('/sales');
    expect(match?.groupKey).toBe('sales');
  });

  it('lights Walk-in purchases for /purchases/walk-in', () => {
    const match = findActiveItem(NAV_GROUPS, '/purchases/walk-in');
    expect(match?.item.to).toBe('/purchases/walk-in');
    expect(match?.groupKey).toBe('purchasing');
  });

  it('lights Danger zone for /super-admin/hard-delete', () => {
    const match = findActiveItem(NAV_GROUPS, '/super-admin/hard-delete');
    expect(match?.item.to).toBe('/super-admin/hard-delete');
    expect(match?.groupKey).toBe('superAdmin');
  });

  it('asserts exactly one active item for each specified path', () => {
    const testPaths = [
      '/',
      '/items/42',
      '/items/import',
      '/items/bulk-add',
      '/consignments/new',
      '/reports/investors',
      '/sales/7',
      '/purchases/walk-in',
      '/super-admin/hard-delete',
    ];

    for (const path of testPaths) {
      const match = findActiveItem(NAV_GROUPS, path);
      expect(match).not.toBeNull();
      expect(match?.item).toBeDefined();
    }
  });

  it('returns null for unmapped paths', () => {
    expect(findActiveItem(NAV_GROUPS, '/unknown-route')).toBeNull();
  });
});
