import * as Sentry from '@sentry/react';
import type { Theme } from '@skipbo/game-core';
import { tagActiveTheme } from './themeAnalytics';

/**
 * Measures how long each theme is actually on screen during active play.
 *
 * Each uninterrupted period a theme is active is recorded — when it ends — as a
 * standalone `theme.active` span carrying a `theme` attribute and the real
 * wall-clock duration. Sentry's Trace Explorer can then `sum(span.duration)`
 * grouped by `theme` for total time spent per theme across all users. A random
 * shuffle that flicks through five themes in a few seconds contributes five tiny
 * spans — a fraction of the weight of someone who sits on one theme for a game.
 *
 * The span is emitted with `forceTransaction: true` and explicit start/end
 * timestamps. A span held open across the whole game would instead become a
 * child of the browser-tracing pageload transaction and get truncated to that
 * transaction's lifetime (a few seconds), so a multi-minute game was being
 * recorded as a few milliseconds.
 *
 * Counting is suspended for independent reasons (see {@link ThemeTimerSuspendReason}):
 * while the tab is hidden, and while the end-of-game screen is up (the time
 * between a win and starting a new game is dead time, not theme usage). Each
 * segment is recorded the moment any reason kicks in, and a fresh one starts
 * once every reason has cleared.
 */
export type ThemeTimerSuspendReason = 'hidden' | 'game-over';

let activeTheme: Theme | null = null;
// Epoch ms when the current segment started, or null when not counting.
let segmentStart: number | null = null;
const suspendedFor = new Set<ThemeTimerSuspendReason>();

function emitSegment(theme: Theme, startMs: number, endMs: number): void {
  const durationMs = endMs - startMs;
  if (durationMs <= 0) return;

  const span = Sentry.startInactiveSpan({
    name: 'theme.active',
    op: 'ui.theme',
    forceTransaction: true,
    startTime: new Date(startMs),
    attributes: { theme, 'theme.duration_ms': durationMs },
  });
  span.end(new Date(endMs));

  if (import.meta.env.DEV) {
    console.info('[theme-analytics] duration', { theme, durationMs });
  }
}

/** Closes the running segment, if any, recording its duration. */
function stopSegment(): void {
  if (activeTheme !== null && segmentStart !== null) {
    emitSegment(activeTheme, segmentStart, Date.now());
  }
  segmentStart = null;
}

/** Starts or stops the current segment to match the desired running state. */
function sync(): void {
  const shouldRun = activeTheme !== null && suspendedFor.size === 0;
  if (shouldRun && segmentStart === null) {
    segmentStart = Date.now();
  } else if (!shouldRun && segmentStart !== null) {
    stopSegment();
  }
}

/**
 * Switches the timer to `theme`, recording the previous theme's segment. Called
 * whenever the resolved theme changes (initial load included).
 */
export function recordActiveTheme(theme: Theme): void {
  if (theme === activeTheme) return;
  stopSegment();
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
