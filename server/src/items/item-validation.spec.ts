import { BadRequestException } from '@nestjs/common';
import { IdentifierType } from '@prisma/client';
import { validateIdentifier } from './item-validation';

describe('validateIdentifier', () => {
  it('accepts a clean 15-digit IMEI', () => {
    expect(validateIdentifier(IdentifierType.IMEI, '358613098765432')).toBe('358613098765432');
  });

  it('rejects two IMEIs glued into one scan', () => {
    expect(() => validateIdentifier(IdentifierType.IMEI, '005363194336779002373484739940')).toThrow(
      'Code looks like two scans glued together; scan again',
    );
  });

  it('rejects an IMEI glued to a serial (15 digits then more chars) on a SERIAL field', () => {
    expect(() => validateIdentifier(IdentifierType.SERIAL, '002762483075225TSTTPQRUUD')).toThrow(
      'Code looks like two scans glued together; scan again',
    );
  });

  it('accepts a normal serial and upper-cases it', () => {
    expect(validateIdentifier(IdentifierType.SERIAL, 'abc-123')).toBe('ABC-123');
  });

  it('rejects a serial longer than 20 chars', () => {
    expect(() => validateIdentifier(IdentifierType.SERIAL, 'A'.repeat(21))).toThrow(BadRequestException);
    expect(() => validateIdentifier(IdentifierType.SERIAL, 'A'.repeat(21))).toThrow('4–20 chars');
  });

  it('accepts a 20-char serial', () => {
    const value = 'A'.repeat(20);
    expect(validateIdentifier(IdentifierType.SERIAL, value)).toBe(value);
  });

  it('allows a system code up to 40 chars', () => {
    const value = 'B'.repeat(40);
    expect(validateIdentifier(IdentifierType.SYSTEM_CODE, value)).toBe(value);
  });
});
