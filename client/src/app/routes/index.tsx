import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { AppShell } from '@/widgets/app-shell';
import { LoginPage } from '@/pages/login';
import { LabelPage } from '@/features/print-label';
import { HomePage } from '@/pages/home';
import { UsersPage } from '@/pages/users';
import { ItemsPage, ItemDetailsPage } from '@/pages/items';
import { AccessoriesPage } from '@/pages/accessories';
import { LocationsPage } from '@/pages/locations';
import { CategoriesPage, CategoryDetailPage } from '@/pages/categories';
import { InvestorsPage, InvestorDetailPage } from '@/pages/investors';
import { SuppliersPage, SupplierDetailPage } from '@/pages/suppliers';
import { BatchesPage, BatchDetailPage } from '@/pages/batches';
import { WalkInPurchasePage } from '@/pages/purchases';
import { SellPage } from '@/pages/sell';
import { SalesPage, SaleDetailPage, ReceiptPage } from '@/pages/sales';
import { CustomersPage, CustomerDetailPage } from '@/pages/customers';
import { ReceiptSettingsPage } from '@/pages/settings';
import type { Permission } from '@/shared/config/permissions';
import { ProtectedRoute } from './ProtectedRoute';

interface RouteConfig {
  path: string;
  permission: Permission;
  Component: React.ComponentType;
}

const PROTECTED_ROUTES: RouteConfig[] = [
  { path: 'sell', permission: 'sell', Component: SellPage },
  { path: 'sales', permission: 'sell', Component: SalesPage },
  { path: 'sales/:id', permission: 'sell', Component: SaleDetailPage },
  { path: 'customers', permission: 'sell', Component: CustomersPage },
  { path: 'customers/:id', permission: 'sell', Component: CustomerDetailPage },
  { path: 'settings/receipt', permission: 'manage_catalog', Component: ReceiptSettingsPage },
  { path: 'users', permission: 'manage_users', Component: UsersPage },
  { path: 'items', permission: 'view_stock', Component: ItemsPage },
  { path: 'items/:id', permission: 'view_stock', Component: ItemDetailsPage },
  { path: 'accessories', permission: 'view_stock', Component: AccessoriesPage },
  { path: 'locations', permission: 'manage_catalog', Component: LocationsPage },
  { path: 'categories', permission: 'manage_catalog', Component: CategoriesPage },
  { path: 'categories/:id', permission: 'manage_catalog', Component: CategoryDetailPage },
  { path: 'investors', permission: 'manage_investors', Component: InvestorsPage },
  { path: 'investors/:id', permission: 'manage_investors', Component: InvestorDetailPage },
  { path: 'suppliers', permission: 'manage_suppliers', Component: SuppliersPage },
  { path: 'suppliers/:id', permission: 'manage_suppliers', Component: SupplierDetailPage },
  { path: 'batches', permission: 'receive_batch', Component: BatchesPage },
  { path: 'batches/:id', permission: 'receive_batch', Component: BatchDetailPage },
  { path: 'purchases/walk-in', permission: 'buy_walk_in', Component: WalkInPurchasePage },
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

      {/* Label route stays outside AppShell so the printed page contains only the label. */}
      <Route
        path="items/:id/label"
        element={
          <ProtectedRoute permission="receive_batch">
            <LabelPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales/:id/receipt"
        element={
          <ProtectedRoute permission="sell">
            <ReceiptPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
