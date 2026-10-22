import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import type { Permission } from '@/shared/config/permissions';

interface ProtectedRouteProps {
  permission?: Permission;
  children?: React.ReactNode;
}

/**
 * Route guard that requires an authenticated user and optionally a specific permission.
 */
export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
