import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { AppShell } from '@/widgets/app-shell';
import { LoginPage } from '@/pages/login';
import { HomePage } from '@/pages/home';
import { UsersPage } from '@/pages/users';
import { ItemsPage, ItemDetailsPage } from '@/pages/items';
import { AccessoriesPage } from '@/pages/accessories';
import { LocationsPage } from '@/pages/locations';
import { CategoriesPage, CategoryDetailPage } from '@/pages/categories';
import { InvestorsPage, InvestorDetailPage } from '@/pages/investors';
import type { Permission } from '@/shared/config/permissions';
import { ProtectedRoute } from './ProtectedRoute';

interface RouteConfig {
  path: string;
  permission: Permission;
  Component: React.ComponentType;
}

const PROTECTED_ROUTES: RouteConfig[] = [
  { path: 'users', permission: 'manage_users', Component: UsersPage },
  { path: 'items', permission: 'view_stock', Component: ItemsPage },
  { path: 'items/:id', permission: 'view_stock', Component: ItemDetailsPage },
  { path: 'accessories', permission: 'view_stock', Component: AccessoriesPage },
  { path: 'locations', permission: 'manage_catalog', Component: LocationsPage },
  { path: 'categories', permission: 'manage_catalog', Component: CategoriesPage },
  { path: 'categories/:id', permission: 'manage_catalog', Component: CategoryDetailPage },
  { path: 'investors', permission: 'manage_investors', Component: InvestorsPage },
  { path: 'investors/:id', permission: 'manage_investors', Component: InvestorDetailPage },
];

/** Redirects already authenticated users away from public pages. */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/**
 * Top-level application routes tree.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        {PROTECTED_ROUTES.map(({ path, permission, Component }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute permission={permission}>
                <Component />
              </ProtectedRoute>
            }
          />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
