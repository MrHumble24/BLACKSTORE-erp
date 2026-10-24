import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  SaveTelegramPayload,
  TelegramBot,
  TelegramChat,
  TelegramConfig,
  UpdateTelegramSettingsPayload,
} from '../model/types';

const BASE = '/integrations/telegram';

export const telegramKeys = {
  all: ['integrations', 'telegram'] as const,
  config: () => [...telegramKeys.all, 'config'] as const,
  chats: () => [...telegramKeys.all, 'chats'] as const,
};

/** Current Telegram config and feature flags (never a token); manage_integrations only. */
export function useTelegramConfig() {
  return useQuery({
    queryKey: telegramKeys.config(),
    queryFn: async () => {
      const { data } = await api.get<TelegramConfig>(BASE);
      return data;
    },
  });
}

/** "Is this bot yours?" — checks a token with Telegram's getMe without saving. */
export function useVerifyTelegramBot() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await api.post<{ ok: boolean; bot: TelegramBot }>(`${BASE}/verify`, { token });
      return data.bot;
    },
  });
}

/** Verifies + saves the token (encrypted server-side), chat ids and feature flags. */
export function useSaveTelegramConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveTelegramPayload) => {
      const { data } = await api.put<TelegramConfig>(BASE, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(telegramKeys.config(), data);
      void queryClient.invalidateQueries({ queryKey: telegramKeys.all });
    },
  });
}

/** Updates settings (toggles, chat ids) WITHOUT a token; the stored bot stays connected. */
export function useUpdateTelegramSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateTelegramSettingsPayload) => {
      const { data } = await api.patch<TelegramConfig>(`${BASE}/settings`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(telegramKeys.config(), data);
      void queryClient.invalidateQueries({ queryKey: telegramKeys.all });
    },
  });
}

/** Chats the bot can post to, for the picker (may be empty). Lazy: pass `enabled`. */
export function useTelegramChats(enabled: boolean) {
  return useQuery({
    queryKey: telegramKeys.chats(),
    queryFn: async () => {
      const { data } = await api.get<TelegramChat[]>(`${BASE}/chats`);
      return data;
    },
    enabled,
  });
}

/** Clears the stored config (back to env fallback). */
export function useClearTelegramConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(BASE);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telegramKeys.all });
    },
  });
}
