import { useMemo, useState } from 'react';
import { isPositiveMoney } from '@/shared/lib';
import type { DayCloseFlagInput, FlagRefType } from '@/entities/business-day';

/** Key a flag by its record so each sale/return/entry can be flagged at most once. */
function flagKey(refType: FlagRefType, refId: number): string {
  return `${refType}:${refId}`;
}

/**
 * Local state for the Close Day screen: the owner's counted drawer totals, the suspicious-record
 * flags, and the optional note. The close mutation itself lives in the business-day entity.
 */
export function useCloseDayForm() {
  const [countedCash, setCountedCash] = useState('');
  const [countedCard, setCountedCard] = useState('');
  const [note, setNote] = useState('');
  const [flags, setFlags] = useState<Record<string, DayCloseFlagInput>>({});

  /** Set or clear the reason for one record; an empty reason removes the flag. */
  function setFlag(refType: FlagRefType, refId: number, reason: string) {
    setFlags((prev) => {
      const next = { ...prev };
      const key = flagKey(refType, refId);
      if (reason.trim()) next[key] = { refType, refId, reason: reason.trim() };
      else delete next[key];
      return next;
    });
  }

  const reasonOf = (refType: FlagRefType, refId: number): string =>
    flags[flagKey(refType, refId)]?.reason ?? '';

  /** Clears every field — used after a day is closed so the next open day starts fresh. */
  function reset() {
    setCountedCash('');
    setCountedCard('');
    setNote('');
    setFlags({});
  }

  const flagList = useMemo(() => Object.values(flags), [flags]);

  // Both drawers must be actually counted — a non-empty, valid (≥ 0) money string. A literal "0"
  // is allowed (an empty drawer is a valid count); a blank field is not (it means "not yet counted").
  const isCounted = (v: string) => v.trim() !== '' && isPositiveMoney(v);
  const canClose = isCounted(countedCash) && isCounted(countedCard);

  return {
    countedCash,
    setCountedCash,
    countedCard,
    setCountedCard,
    note,
    setNote,
    reasonOf,
    setFlag,
    flagList,
    canClose,
    reset,
  };
}

export type CloseDayForm = ReturnType<typeof useCloseDayForm>;
