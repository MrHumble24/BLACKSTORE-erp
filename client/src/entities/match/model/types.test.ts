import { describe, expect, it } from 'vitest';
import { isTelegramLink } from './types';

describe('isTelegramLink', () => {
  it('accepts only https://t.me/ links', () => {
    expect(isTelegramLink('https://t.me/group/123')).toBe(true);
    expect(isTelegramLink('http://t.me/group/123')).toBe(false);
    expect(isTelegramLink('javascript:alert(1)')).toBe(false);
    expect(isTelegramLink('https://t.me.evil.com/x')).toBe(false);
  });
});
