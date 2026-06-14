import * as Sentry from '@sentry/react';
import type { Span } from '@sentry/react';
import type { Theme } from '@/types';
import { tagActiveTheme } from './themeAnalytics';

/**
 * Measures how long each theme is actually on screen during active play.
 *
 * Every uninterrupted period a theme is active is recorded as a `theme.active`
 * span carrying a `theme` attribute. Span duration is real wall-clock time, so
 * Sentry's Trace Explorer can `sum(span.duration)` grouped by `theme` to get the
 * total time spent per theme across all users. A random shuffle that flicks
 * through five themes in a few seconds therefore contributes five tiny spans —
 * a fraction of the weight of someone who sits on one theme for a whole game.
 *
 * Counting is suspended for independent reasons (see {@link ThemeTimerSuspendReason}):
 * while the tab is hidden, and while the end-of-game screen is up (the time
 * between a win and starting a new game is dead time, not theme usage). The span
 * is closed — and thus sent — the moment any reason kicks in, and a fresh span
 * opens once every reason has cleared.
 */
export type ThemeTimerSuspendReason = 'hidden' | 'game-over';

let activeTheme: Theme | null = null;
let activeSpan: Span | null = null;
let segmentStart = 0;
const suspendedFor = new Set<ThemeTimerSuspendReason>();

function openSpan(theme: Theme): void {
  segmentStart = Date.now();
  activeSpan = Sentry.startInactiveSpan({
    name: 'theme.active',
    op: 'ui.theme',
    attributes: { theme },
  });
}

function closeSpan(): void {
  if (!activeSpan) return;
  activeSpan.end();
  activeSpan = null;

  if (import.meta.env.DEV) {
    console.info('[theme-analytics] duration', {
      theme: activeTheme,
      durationMs: Date.now() - segmentStart,
    });
  }
}

/** Opens or closes the span so it matches the desired running state. */
function sync(): void {
  const shouldRun = activeTheme !== null && suspendedFor.size === 0;
  if (shouldRun && !activeSpan) {
    openSpan(activeTheme as Theme);
  } else if (!shouldRun && activeSpan) {
    closeSpan();
  }
}

/**
 * Switches the timer to `theme`, closing the previous theme's segment. Called
 * whenever the resolved theme changes (initial load included).
 */
export function recordActiveTheme(theme: Theme): void {
  if (theme === activeTheme) return;
  closeSpan();
  activeTheme = theme;
  tagActiveTheme(theme);
  sync();
}

/** Stops counting for `reason` (tab hidden, end-of-game screen, …). */
export function suspendThemeTimer(reason: ThemeTimerSuspendReason): void {
  suspendedFor.add(reason);
  sync();
}

/** Clears `reason`; counting resumes once no reason remains. */
export function resumeThemeTimer(reason: ThemeTimerSuspendReason): void {
  suspendedFor.delete(reason);
  sync();
}
