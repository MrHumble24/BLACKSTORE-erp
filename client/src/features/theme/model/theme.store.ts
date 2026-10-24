import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'blackstore_theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = resolved;
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const initialStored = (typeof localStorage !== 'undefined'
  ? (localStorage.getItem(STORAGE_KEY) as Theme)
  : null) || 'system';

const initialResolved = resolveTheme(initialStored);
applyThemeClass(initialResolved);

/** Zustand store managing the application appearance (light, dark, system). */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialStored,
  resolvedTheme: initialResolved,
  setTheme: (theme: Theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    const resolved = resolveTheme(theme);
    applyThemeClass(resolved);
    set({ theme, resolvedTheme: resolved });
  },
  toggleTheme: () => {
    const current = get().resolvedTheme;
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') {
      const resolved = getSystemTheme();
      applyThemeClass(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  });
}
