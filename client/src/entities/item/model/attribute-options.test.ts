import { describe, it, expect } from 'vitest';
import { COMMON_COLOR_OPTIONS, COMMON_PROCESSOR_OPTIONS } from './attribute-options';

describe('attribute-options', () => {
  it('contains expected color options with no duplicates', () => {
    expect(COMMON_COLOR_OPTIONS.length).toBeGreaterThan(0);
    expect(COMMON_COLOR_OPTIONS).toContain('Natural Titanium');
    expect(COMMON_COLOR_OPTIONS).toContain('Desert Titanium');
    const uniqueColors = new Set(COMMON_COLOR_OPTIONS);
    expect(uniqueColors.size).toBe(COMMON_COLOR_OPTIONS.length);
  });

  it('contains expected processor options with no duplicates', () => {
    expect(COMMON_PROCESSOR_OPTIONS.length).toBeGreaterThan(0);
    expect(COMMON_PROCESSOR_OPTIONS).toContain('M1');
    expect(COMMON_PROCESSOR_OPTIONS).toContain('M4 Pro');
    const uniqueProcessors = new Set(COMMON_PROCESSOR_OPTIONS);
    expect(uniqueProcessors.size).toBe(COMMON_PROCESSOR_OPTIONS.length);
  });
});
