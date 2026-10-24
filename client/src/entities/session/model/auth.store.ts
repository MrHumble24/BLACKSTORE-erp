import { create } from 'zustand';
import type { User } from '@/entities/user';
import { SUPER_ONLY_PERMISSIONS, type Permission } from '@/shared/config/permissions';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logoutClient: () => void;
  hasPermission: (permission: Permission) => boolean;
}

/** Global Zustand store holding client authentication state and permission checks. */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logoutClient: () => set({ user: null, isLoading: false }),
  hasPermission: (permission: Permission) => {
    const user = get().user;
    if (!user) return false;
    if (user.role.permissions.includes(permission)) return true;
    // Admin implicitly holds every permission except the super-admin-only ones (F12).
    if (user.role.name === 'Admin') {
      return !(SUPER_ONLY_PERMISSIONS as readonly Permission[]).includes(permission);
    }
    return false;
  },
}));
