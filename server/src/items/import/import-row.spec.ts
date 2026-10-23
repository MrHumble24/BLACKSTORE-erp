import { AttributeType } from '@prisma/client';
import { parseRow, validateHeader, type ImportContext, type RawRow } from './import-row';

/** A small fixture: one serialized category with a required SELECT attribute, plus master data. */
function context(): ImportContext {
  return {
    categories: new Map([
      [
        'iphone',
        {
          id: 1,
          isSerialized: true,
          attributes: [
            { key: 'storage', type: AttributeType.SELECT, options: ['128GB', '256GB'], required: true },
          ],
          models: new Map([['iphone 15 pro', 10]]),
        },
      ],
    ]),
    investors: new Map([
      ['OWN', { id: 1, isActive: true }],
      ['DEAD', { id: 2, isActive: false }],
    ]),
    locations: new Map([
      ['sklad', { id: 1, isActive: true }],
      ['closed', { id: 2, isActive: false }],
    ]),
    attributeKeys: new Set(['storage']),
  };
}

const goodRow: RawRow = {
  category: 'iPhone',
  model: 'iPhone 15 Pro',
  identifier: '350000000000001',
  owner_code: 'OWN',
  location: 'Sklad',
  storage: '128GB',
};

describe('validateHeader', () => {
  const headers = ['category', 'model', 'identifier', 'owner_code', 'location', 'storage'];

  it('accepts fixed columns plus a known attribute', () => {
    expect(validateHeader(headers, new Set(['storage']))).toBeNull();
  });

  it('rejects an unknown column', () => {
    expect(validateHeader([...headers, 'color'], new Set(['storage']))).toMatch(/Unknown column "color"/);
  });

  it('rejects a missing required column', () => {
    expect(validateHeader(['category', 'model', 'identifier', 'owner_code'], new Set())).toMatch(
      /Missing required column "location"/,
    );
  });
});

describe('parseRow', () => {
  it('parses a good row into an item input (IMEI detected, attribute typed)', () => {
    const result = parseRow(goodRow, context(), new Set());
    expect(result.ok).toBe(true);
    const input = result.ok ? result.input : null;
    expect(input?.productModelId).toBe(10);
    expect(input?.investorId).toBe(1);
    expect(input?.locationId).toBe(1);
    expect(input?.identifiers).toEqual([{ type: 'IMEI', value: '350000000000001' }]);
    expect(input?.attributes).toEqual({ storage: '128GB' });
  });

  it('rejects a bad IMEI (all digits but not 15)', () => {
    const result = parseRow({ ...goodRow, identifier: '12345' }, context(), new Set());
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/IMEI must be 15 digits/) });
  });

  it('rejects an unknown owner code', () => {
    const result = parseRow({ ...goodRow, owner_code: 'ZZZ' }, context(), new Set());
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/Unknown owner code "ZZZ"/) });
  });

  it('rejects an inactive location', () => {
    const result = parseRow({ ...goodRow, location: 'Closed' }, context(), new Set());
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/inactive/) });
  });

  it('rejects a missing required attribute', () => {
    const { storage, ...noStorage } = goodRow;
    void storage;
    const result = parseRow(noStorage, context(), new Set());
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/required/) });
  });

  it('rejects a duplicate identifier within the file', () => {
    const seen = new Set<string>();
    expect(parseRow(goodRow, context(), seen).ok).toBe(true);
    const second = parseRow({ ...goodRow, storage: '256GB' }, context(), seen);
    expect(second).toEqual({ ok: false, message: expect.stringMatching(/appears more than once/) });
  });
});
