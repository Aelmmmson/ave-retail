import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('ave_theme') as ThemeMode) || 'dark',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ave_theme', next);
    set({ theme: next });
  },
  setTheme: (theme) => {
    localStorage.setItem('ave_theme', theme);
    set({ theme });
  }
}));
