import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavGroupsState {
  /** Record of collapsed group keys. Only collapsed keys are stored (true); missing = open. */
  collapsed: Record<string, boolean>;
  /** Toggles a group between collapsed and open. */
  toggle: (key: string) => void;
}

/**
 * Persisted collapsible group state in localStorage (`blackstore-nav-groups`).
 * Only collapsed keys are persisted so that any new groups automatically default to open,
 * and old/removed keys remain harmless.
 */
export const useNavGroupsStore = create<NavGroupsState>()(
  persist(
    (set) => ({
      collapsed: {},
      toggle: (key) =>
        set((state) => {
          const next = { ...state.collapsed };
          if (next[key]) {
            delete next[key];
          } else {
            next[key] = true;
          }
          return { collapsed: next };
        }),
    }),
    {
      name: 'blackstore-nav-groups',
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        const candidate = (persistedState as Partial<NavGroupsState>).collapsed;
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
          return currentState;
        }
        const validCollapsed: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(candidate)) {
          if (v === true) {
            validCollapsed[k] = true;
          }
        }
        return {
          ...currentState,
          collapsed: validCollapsed,
        };
      },
    },
  ),
);
