import * as Sentry from '@sentry/react';
import type { Theme } from '@/types';

/**
 * Where a theme change originated. Lets the aggregate Sentry breakdown
 * distinguish deliberate picks from the random-shuffle button and from the
 * theme that was simply active when the session loaded.
 */
export type ThemeSelectionSource = 'manual' | 'random' | 'session';

/**
 * Tags the Sentry scope with the active theme so every later event (errors,
 * transactions) is attributed to whatever theme was on screen.
 */
export function tagActiveTheme(theme: Theme): void {
  Sentry.setTag('theme', theme);
}

/**
 * Records a deliberate theme change. Emits one `theme.selected` message that
 * Sentry groups into a single issue; the `theme` / `theme.source` tag
 * distribution on that issue is the per-theme usage breakdown.
 */
export function trackThemeSelection(params: {
  theme: Theme;
  previousTheme?: Theme;
  source: Exclude<ThemeSelectionSource, 'session'>;
}): void {
  const { theme, previousTheme, source } = params;

  // Keep the scope tag in sync so any later event reflects the new theme.
  Sentry.setTag('theme', theme);

  Sentry.captureMessage('theme.selected', {
    level: 'info',
    tags: { theme, 'theme.source': source },
    extra: { previousTheme: previousTheme ?? null },
  });

  if (import.meta.env.DEV) {
    console.info('[theme-analytics] selected', { theme, previousTheme, source });
  }
}
