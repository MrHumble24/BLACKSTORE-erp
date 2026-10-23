import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Backup, RestorePayload, RestoreResult } from '../model/types';

export const backupKeys = {
  all: ['backups'] as const,
  list: () => [...backupKeys.all, 'list'] as const,
};

/** The last 30 backups, newest first (manage_backups, Admin). */
export function useBackups() {
  return useQuery({
    queryKey: backupKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<Backup[]>('/backups');
      return data;
    },
  });
}

/** Runs a manual backup (same function as the 03:00 daily job). */
export function useRunBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Backup>('/backups');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

/** Restores the database from a backup after retyping its file name as confirmation. */
export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileName, confirm }: RestorePayload) => {
      const { data } = await api.post<RestoreResult>(
        `/backups/${encodeURIComponent(fileName)}/restore`,
        { confirm },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
