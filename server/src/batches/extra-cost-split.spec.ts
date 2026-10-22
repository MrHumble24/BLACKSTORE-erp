import { CostSplitMethod, Prisma } from '@prisma/client';
import { splitExtraCost } from './extra-cost-split';

const d = (v: string | number) => new Prisma.Decimal(v);
const line = (id: number, unitPrice: string) => ({ id, unitPrice: d(unitPrice) });

describe('splitExtraCost', () => {
  it('EQUAL puts the rounding remainder on the last line so parts sum to the total', () => {
    const shares = splitExtraCost({
      total: d('100'),
      method: CostSplitMethod.EQUAL,
      lines: [line(1, '0'), line(2, '0'), line(3, '0')], // 100 / 3 = 33.33, 33.33, 33.34
    });
    expect(shares.get(1)?.toFixed(2)).toBe('33.33');
    expect(shares.get(2)?.toFixed(2)).toBe('33.33');
    expect(shares.get(3)?.toFixed(2)).toBe('33.34');
    const sum = [...shares.values()].reduce((s, v) => s.plus(v), d(0));
    expect(sum.toFixed(2)).toBe('100.00');
  });

  it('BY_PRICE weights each device by its unit price', () => {
    const shares = splitExtraCost({
      total: d('90'),
      method: CostSplitMethod.BY_PRICE,
      lines: [line(1, '100'), line(2, '200')], // 1/3 and 2/3 of 90
    });
    expect(shares.get(1)?.toFixed(2)).toBe('30.00');
    expect(shares.get(2)?.toFixed(2)).toBe('60.00');
  });

  it('BY_PRICE falls back to EQUAL when every unit price is 0', () => {
    const shares = splitExtraCost({
      total: d('50'),
      method: CostSplitMethod.BY_PRICE,
      lines: [line(1, '0'), line(2, '0')],
    });
    expect(shares.get(1)?.toFixed(2)).toBe('25.00');
    expect(shares.get(2)?.toFixed(2)).toBe('25.00');
  });

  it('NONE gives every line 0', () => {
    const shares = splitExtraCost({
      total: d('100'),
      method: CostSplitMethod.NONE,
      lines: [line(1, '100'), line(2, '200')],
    });
    expect(shares.get(1)?.toFixed(2)).toBe('0.00');
    expect(shares.get(2)?.toFixed(2)).toBe('0.00');
  });
});
