import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/api';
import type { User, Language } from '@/entities/user';
import { useAuthStore } from '../model/auth.store';

interface LoginCredentials {
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

/**
 * App-start bootstrap: GET /auth/me once and fill the Zustand auth store
 * (the current user lives here, not in TanStack Query).
 */
export function useBootstrapAuth() {
  const { i18n } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    const authStore = useAuthStore.getState();

    void (async () => {
      try {
        const response = await apiClient.get<AuthResponse>('/auth/me');
        if (isMounted) {
          authStore.setUser(response.data.user);
          void i18n.changeLanguage(response.data.user.language);
        }
      } catch {
        if (isMounted) {
          authStore.setUser(null);
        }
      } finally {
        if (isMounted) {
          authStore.setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [i18n]);
}

/** Mutation hook for logging in. */
export function useLogin() {
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post<AuthResponse>(
        '/auth/login',
        credentials,
      );
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      void i18n.changeLanguage(data.user.language);
      navigate('/', { replace: true });
    },
  });
}

/** Mutation hook for logging out. */
export function useLogout() {
  const logoutClient = useAuthStore((state) => state.logoutClient);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSettled: () => {
      logoutClient();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

/** Mutation hook for updating user's preferred language. */
export function useChangeLanguage() {
  const setUser = useAuthStore((state) => state.setUser);
  const { i18n } = useTranslation();

  return useMutation({
    mutationFn: async (language: Language) => {
      const response = await apiClient.patch<AuthResponse>('/auth/me', {
        language,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      void i18n.changeLanguage(data.user.language);
    },
  });
}
