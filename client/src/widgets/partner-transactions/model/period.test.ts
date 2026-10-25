import { describe, expect, it } from 'vitest';
import { rangeFor } from './period';

const local = (iso: string) => new Date(iso);

describe('rangeFor', () => {
  // Sunday 2026-10-25 15:30 local time.
  const now = new Date(2026, 9, 25, 15, 30);

  it('today spans the whole local day', () => {
    const { from, to } = rangeFor('today', {}, now);
    expect(local(from).getTime()).toBe(new Date(2026, 9, 25).getTime());
    expect(local(to).getTime()).toBe(new Date(2026, 9, 25, 23, 59, 59, 999).getTime());
  });

  it('week starts on Monday (Sunday belongs to the week before it)', () => {
    const { from, to } = rangeFor('week', {}, now);
    expect(local(from).getTime()).toBe(new Date(2026, 9, 19).getTime());
    expect(local(to).getTime()).toBe(new Date(2026, 9, 25, 23, 59, 59, 999).getTime());
  });

  it('custom with one date uses it for both ends, reversed range is swapped', () => {
    const single = rangeFor('custom', { to: '2026-10-01' }, now);
    expect(local(single.from).getTime()).toBe(new Date(2026, 9, 1).getTime());
    expect(local(single.to).getTime()).toBe(new Date(2026, 9, 1, 23, 59, 59, 999).getTime());
    const reversed = rangeFor('custom', { from: '2026-10-10', to: '2026-10-01' }, now);
    expect(local(reversed.from).getTime()).toBe(new Date(2026, 9, 1).getTime());
  });
});
