import { describe, expect, it } from 'vitest';
import { createWatchSchema, parseAliases, toCreatePayload, toUpdatePayload } from './watch.schema';

const schema = createWatchSchema((k) => k);
const base = { name: 'iPhone 17 Pro Max', aliases: '', productModelId: '', maxPrice: '', currency: 'USD' as const };

describe('watch form schema', () => {
  it('trims alias lines and drops blanks', () => {
    expect(parseAliases(' 17 pro max \n\n17pm\n ')).toEqual(['17 pro max', '17pm']);
  });

  it('rejects more than 30 aliases and a bad price', () => {
    const many = Array.from({ length: 31 }, (_, i) => `a${i}`).join('\n');
    expect(schema.safeParse({ ...base, aliases: many }).success).toBe(false);
    expect(schema.safeParse({ ...base, maxPrice: '12.345' }).success).toBe(false);
    expect(schema.safeParse({ ...base, maxPrice: '1300,50' }).success).toBe(true);
    expect(schema.safeParse({ ...base, maxPrice: '9999999999.99' }).success).toBe(true);
    expect(schema.safeParse({ ...base, maxPrice: '12345678901' }).success).toBe(false);
  });

  it('omits empty optionals on create and nulls them on update', () => {
    expect(toCreatePayload(base)).toEqual({ name: base.name, aliases: [], currency: 'USD' });
    expect(toUpdatePayload(base)).toMatchObject({ productModelId: null, maxPrice: null });
    expect(toCreatePayload({ ...base, productModelId: '4', maxPrice: '1300,5' })).toMatchObject({
      productModelId: 4,
      maxPrice: '1300.5',
    });
  });
});
