import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import type { Theme } from '@skipbo/game-core';
import { recordActiveTheme, resumeThemeTimer, suspendThemeTimer } from '@/monitoring/themeUsageTimer';

/**
 * Drives the theme-usage timer from the resolved next-themes value, and pauses
 * it while the tab is hidden so only foreground time is measured. See
 * {@link recordActiveTheme} for how the per-theme durations are reported.
 */
export function useThemeUsageReporter(): void {
  const { theme } = useTheme();

  useEffect(() => {
    if (theme) {
      recordActiveTheme(theme as Theme);
    }
  }, [theme]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        suspendThemeTimer('hidden');
      } else {
        resumeThemeTimer('hidden');
      }
    };
    const onPageHide = () => suspendThemeTimer('hidden');

    document.addEventListener('visibilitychange', onVisibilityChange);
    // pagehide covers tab close and navigation, including bfcache.
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      suspendThemeTimer('hidden');
    };
  }, []);
}

/**
 * Pauses theme-usage counting while the end-of-game screen is shown, so the
 * idle time between a win and starting a new game is not attributed to the
 * active theme. Call from the screen that knows whether the game is over.
 */
export function useThemeUsageGameGate(isGameOver: boolean): void {
  useEffect(() => {
    if (isGameOver) {
      suspendThemeTimer('game-over');
    } else {
      resumeThemeTimer('game-over');
    }
    return () => resumeThemeTimer('game-over');
  }, [isGameOver]);
}
