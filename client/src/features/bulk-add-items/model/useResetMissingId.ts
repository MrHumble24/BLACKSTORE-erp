import { useEffect } from 'react';

/**
 * Clears a persisted id once its list has loaded without it (deactivated or belongs to another
 * category). An undefined list means "not loaded yet" and is ignored; an empty list does reset.
 */
export function useResetMissingId<T extends { id: number }>(
  list: T[] | undefined,
  id: number,
  onMissing: () => void,
) {
  useEffect(() => {
    if (!list || id <= 0) return;
    if (!list.some((entry) => entry.id === id)) onMissing();
  }, [list, id, onMissing]);
}
