import { useState, useMemo } from 'react';
import { isStrictlyPositiveMoney } from '@/shared/lib';
import type { SellCartLine, DeviceCartLine, AccessoryCartLine } from '../model/types';
import { isBelowMinPrice } from './isBelowMinPrice';

/** Custom hook managing state and operations for the POS selling cart. */
export function useSellCart() {
  const [lines, setLines] = useState<SellCartLine[]>([]);

  const totalCents = useMemo(() => {
    return lines.reduce((acc, line) => {
      const priceCents = Math.round((Number(line.unitPrice) || 0) * 100);
      const qty = line.type === 'accessory' ? line.quantity : 1;
      return acc + priceCents * qty;
    }, 0);
  }, [lines]);

  const total = (totalCents / 100).toFixed(2);

  const hasPriceBelowMin = useMemo(() => lines.some(isBelowMinPrice), [lines]);

  /** True when any line has an empty, zero or non-numeric price (server rejects these). */
  const hasInvalidPrice = useMemo(
    () => lines.some((l) => !isStrictlyPositiveMoney(l.unitPrice)),
    [lines],
  );

  const existingItemIds = useMemo(() => {
    return lines
      .filter((l): l is DeviceCartLine => l.type === 'device')
      .map((l) => l.itemId);
  }, [lines]);

  const addDevice = (line: DeviceCartLine) => setLines((prev) => [...prev, line]);
  const addAccessory = (line: AccessoryCartLine) => setLines((prev) => [...prev, line]);
  const updatePrice = (idx: number, price: string) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitPrice: price } : l)));
  const updateWarranty = (idx: number, w: string) =>
    setLines((prev) =>
      prev.map((l, i) => (i === idx && l.type === 'device' ? { ...l, warrantyUntil: w } : l)),
    );
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const clearCart = () => setLines([]);

  return {
    lines,
    total,
    totalCents,
    hasPriceBelowMin,
    hasInvalidPrice,
    existingItemIds,
    addDevice,
    addAccessory,
    updatePrice,
    updateWarranty,
    removeLine,
    clearCart,
  };
}
