// next-themes default storageKey. Update if ThemeProvider sets a custom one.
const THEME_STORAGE_KEY = 'theme';

const LEGACY_THEME_REMAPS: Record<string, string> = {
  'theme-bonbon': 'theme-candy',
};

export function migrateLegacyThemeValue(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (current && current in LEGACY_THEME_REMAPS) {
      window.localStorage.setItem(THEME_STORAGE_KEY, LEGACY_THEME_REMAPS[current]);
    }
  } catch {
    // Private mode, quota, or no localStorage — fall through to default.
  }
}
