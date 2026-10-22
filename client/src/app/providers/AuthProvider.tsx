import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { setOnUnauthorized } from '@/shared/api';
import { useBootstrapAuth, useAuthStore } from '@/features/auth';

/**
 * Loading screen rendered while checking session on app initialization.
 */
function AuthLoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    </div>
  );
}

/**
 * Provider that bootstraps user session into the auth store and handles 401 redirects
 * (store cleanup + query cache clear, same as useLogout).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOnUnauthorized(() => {
      useAuthStore.getState().logoutClient();
      queryClient.clear();
      navigate('/login', { replace: true });
    });
  }, [navigate, queryClient]);

  useBootstrapAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
