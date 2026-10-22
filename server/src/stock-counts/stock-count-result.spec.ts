import { ItemStatus } from '@prisma/client';
import type { ItemBrief } from '../common/item-brief';
import { classifyScan, computeResult, ScanWithItem } from './stock-count-result';

const item = (id: number, status: ItemStatus, locationId: number): ItemBrief =>
  ({
    id,
    status,
    identifiers: [],
    productModel: { id: 1, name: 'iPhone' },
    location: { id: locationId, name: 'Shop' },
  }) satisfies ItemBrief;

describe('classifyScan', () => {
  it('FOUND when the item is in stock at this location', () => {
    expect(classifyScan(item(1, ItemStatus.IN_STOCK, 5), 5)).toBe('FOUND');
  });

  it('WRONG_LOCATION when in stock elsewhere', () => {
    expect(classifyScan(item(1, ItemStatus.IN_STOCK, 9), 5)).toBe('WRONG_LOCATION');
  });

  it('WRONG_LOCATION when here but not in stock', () => {
    expect(classifyScan(item(1, ItemStatus.SOLD, 5), 5)).toBe('WRONG_LOCATION');
  });

  it('UNKNOWN when no item resolved', () => {
    expect(classifyScan(null, 5)).toBe('UNKNOWN');
  });
});

describe('computeResult', () => {
  const scan = (code: string, it: ItemBrief | null): ScanWithItem => ({
    scannedCode: code,
    scannedAt: new Date(),
    item: it,
  });

  it('splits into missing, wrongLocation and unknown against current stock', () => {
    const here1 = item(1, ItemStatus.IN_STOCK, 5);
    const here2 = item(2, ItemStatus.IN_STOCK, 5);
    const elsewhere = item(3, ItemStatus.IN_STOCK, 9);
    const expected = [here1, here2];
    const scans = [scan('A', here1), scan('C', elsewhere), scan('ZZZ', null)];

    const result = computeResult(expected, scans);
    expect(result.expectedCount).toBe(2);
    expect(result.found).toBe(1); // only here1 scanned
    expect(result.missing.map((i) => i.id)).toEqual([2]); // here2 not scanned
    expect(result.wrongLocation.map((i) => i.id)).toEqual([3]); // elsewhere, not expected
    expect(result.unknown).toEqual([{ code: 'ZZZ', scannedAt: expect.any(Date) }]);
  });

  it('dedupes a wrong-location item scanned twice', () => {
    const elsewhere = item(3, ItemStatus.IN_STOCK, 9);
    const result = computeResult([], [scan('C', elsewhere), scan('C2', elsewhere)]);
    expect(result.wrongLocation.map((i) => i.id)).toEqual([3]);
  });
});
