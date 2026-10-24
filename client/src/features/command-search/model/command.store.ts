import { useEffect } from 'react';
import { create } from 'zustand';

interface CommandState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/** Store managing Command+K palette open/close state. */
export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  setOpen: (open: boolean) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));

/** Global keyboard shortcut hook listening for Cmd+K / Ctrl+K. */
export function useCommandShortcut() {
  const toggle = useCommandStore((state) => state.toggle);
  const setOpen = useCommandStore((state) => state.setOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, setOpen]);
}

/** Detects if current platform is macOS for display badge (⌘K vs Ctrl+K). */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return true;
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
}
