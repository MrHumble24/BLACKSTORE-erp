import { useEffect } from 'react';
import { useAuthStore } from '@/entities/session';
import { useBulkAddStore } from './bulkAdd.store';

/**
 * Ties the persisted settings to the logged-in user (shared computers): another user's values are
 * reset. `ready` is false until the stored userId matches, so the old values never flash.
 */
export function useBulkAddUserGuard() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const storeUserId = useBulkAddStore((s) => s.userId);
  const reset = useBulkAddStore((s) => s.reset);
  const setUserId = useBulkAddStore((s) => s.setUserId);

  useEffect(() => {
    if (isAuthLoading || userId === null) return;
    if (storeUserId === null) setUserId(userId);
    else if (storeUserId !== userId) reset(userId);
  }, [isAuthLoading, storeUserId, userId, reset, setUserId]);

  return { ready: userId !== null && storeUserId === userId };
}
