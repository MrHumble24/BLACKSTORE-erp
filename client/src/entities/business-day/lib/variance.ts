import { isPositiveMoney, normalizeMoney } from '@/shared/lib';

/** A difference under half a cent counts as a match (avoids float dust reading as a variance). */
export function isMatch(diff: number | null): boolean {
  return diff != null && Math.abs(diff) < 0.005;
}

/**
 * Variance = counted − expected, as a number; null while the count isn't a valid amount yet.
 * Blank is explicitly "not counted yet" — `isPositiveMoney('')` is true (Number('') === 0), so it
 * must be guarded, otherwise an empty field reads as a false "short" of the whole expected amount.
 */
export function variance(counted: string, expected: string): number | null {
  if (!counted.trim() || !isPositiveMoney(counted)) return null;
  return Number(normalizeMoney(counted)) - Number(expected);
}
