export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
}

const THEME_STORAGE_KEY = 'erogaai_theme_preference';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'auto';
}

export function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return mode;
}

export function applyThemeToDocument(mode: ThemeMode): 'light' | 'dark' {
  const resolved = resolveEffectiveTheme(mode);
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  return resolved;
}
