import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Span } from '@sentry/react';

vi.mock('@sentry/react', () => ({
  setTag: vi.fn(),
  startInactiveSpan: vi.fn(),
}));

// Re-imported per test so the timer's module-level state starts clean.
let Sentry: typeof import('@sentry/react');
let timer: typeof import('../themeUsageTimer');

// Every span handed out by startInactiveSpan, in creation order.
let spans: { end: ReturnType<typeof vi.fn> }[] = [];

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(0);

  Sentry = await import('@sentry/react');
  timer = await import('../themeUsageTimer');

  spans = [];
  vi.mocked(Sentry.startInactiveSpan)
    .mockReset()
    .mockImplementation(() => {
      const span = { end: vi.fn() };
      spans.push(span);
      return span as unknown as Span;
    });
  vi.mocked(Sentry.setTag).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

const startInactiveSpan = () => vi.mocked(Sentry.startInactiveSpan);

describe('themeUsageTimer', () => {
  test('records nothing until a segment ends', () => {
    timer.recordActiveTheme('theme-paper');

    expect(Sentry.setTag).toHaveBeenCalledWith('theme', 'theme-paper');
    expect(startInactiveSpan()).not.toHaveBeenCalled();
  });

  test('emits a standalone theme.active span with the real duration when the segment ends', () => {
    timer.recordActiveTheme('theme-paper');
    vi.advanceTimersByTime(90_000); // 90s on screen
    timer.suspendThemeTimer('hidden');

    expect(startInactiveSpan()).toHaveBeenCalledWith({
      name: 'theme.active',
      op: 'ui.theme',
      forceTransaction: true,
      startTime: new Date(0),
      attributes: { theme: 'theme-paper', 'theme.duration_ms': 90_000 },
    });
    expect(spans[0].end).toHaveBeenCalledWith(new Date(90_000));
  });

  test('records the previous theme when the theme changes, then keeps timing the new one', () => {
    timer.recordActiveTheme('theme-paper');
    vi.advanceTimersByTime(5_000);
    timer.recordActiveTheme('theme-neon');

    expect(startInactiveSpan()).toHaveBeenCalledTimes(1);
    expect(startInactiveSpan()).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: { theme: 'theme-paper', 'theme.duration_ms': 5_000 } }),
    );
  });

  test('does not record a zero-length segment when the theme is unchanged', () => {
    timer.recordActiveTheme('theme-paper');
    timer.recordActiveTheme('theme-paper');

    expect(startInactiveSpan()).not.toHaveBeenCalled();
  });

  test('does not emit a span for a segment that ends on the same tick it started', () => {
    timer.recordActiveTheme('theme-paper');
    // Suspend with no time elapsed: the segment has zero duration.
    timer.suspendThemeTimer('hidden');

    expect(startInactiveSpan()).not.toHaveBeenCalled();
  });

  test('stays suspended until every reason is cleared', () => {
    timer.recordActiveTheme('theme-wool');
    vi.advanceTimersByTime(1_000);
    timer.suspendThemeTimer('hidden');
    expect(startInactiveSpan()).toHaveBeenCalledTimes(1);

    timer.suspendThemeTimer('game-over');
    // Clearing only one reason must not resume counting (still game-over).
    timer.resumeThemeTimer('hidden');
    expect(startInactiveSpan()).toHaveBeenCalledTimes(1);

    // Once the last reason clears, a fresh segment runs and is recorded.
    timer.resumeThemeTimer('game-over');
    vi.advanceTimersByTime(2_000);
    timer.suspendThemeTimer('hidden');
    expect(startInactiveSpan()).toHaveBeenCalledTimes(2);
    expect(startInactiveSpan()).toHaveBeenLastCalledWith(
      expect.objectContaining({ attributes: { theme: 'theme-wool', 'theme.duration_ms': 2_000 } }),
    );
  });

  test('a theme change while suspended records the old theme but does not start a new segment', () => {
    timer.recordActiveTheme('theme-paper');
    vi.advanceTimersByTime(3_000);
    timer.suspendThemeTimer('game-over');
    expect(startInactiveSpan()).toHaveBeenCalledTimes(1);

    timer.recordActiveTheme('theme-neon');
    vi.advanceTimersByTime(3_000);

    // No new segment opened while suspended.
    expect(startInactiveSpan()).toHaveBeenCalledTimes(1);
    expect(Sentry.setTag).toHaveBeenLastCalledWith('theme', 'theme-neon');
  });
});
