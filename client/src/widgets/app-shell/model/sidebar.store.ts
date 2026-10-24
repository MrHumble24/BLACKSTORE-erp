import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  /** True when desktop sidebar is shrunk (icon-only rail), false when expanded. */
  isShrunk: boolean;
  /** Toggles between shrunk and expanded state. */
  toggleShrunk: () => void;
  /** Sets shrunk state explicitly. */
  setShrunk: (shrunk: boolean) => void;
}

/**
  * Persisted desktop sidebar collapse state in localStorage (`blackstore-sidebar-shrunk`).
  * When true, desktop navigation collapses into a compact icon rail (w-[68px]).
  */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isShrunk: false,
      toggleShrunk: () => set((state) => ({ isShrunk: !state.isShrunk })),
      setShrunk: (shrunk) => set({ isShrunk: shrunk }),
    }),
    {
      name: 'blackstore-sidebar-shrunk',
    },
  ),
);
