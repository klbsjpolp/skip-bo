import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Span } from '@sentry/react';

vi.mock('@sentry/react', () => ({
  setTag: vi.fn(),
  startInactiveSpan: vi.fn(),
}));

// Re-imported per test so the timer's module-level state starts clean.
let Sentry: typeof import('@sentry/react');
let timer: typeof import('../themeUsageTimer');

/** Returns a fake span plus a handle to assert it was ended. */
function makeSpan() {
  const end = vi.fn();
  return { span: { end } as unknown as Span, end };
}

/** Queues fake spans to be handed out by successive startInactiveSpan calls. */
function queueSpans(count: number) {
  const spans = Array.from({ length: count }, makeSpan);
  const mock = vi.mocked(Sentry.startInactiveSpan);
  spans.forEach(({ span }) => mock.mockReturnValueOnce(span));
  return spans;
}

beforeEach(async () => {
  vi.resetModules();
  Sentry = await import('@sentry/react');
  timer = await import('../themeUsageTimer');
  // The Sentry mock instances survive resetModules; clear their history and
  // queued return values so each test starts from zero.
  vi.mocked(Sentry.startInactiveSpan).mockReset();
  vi.mocked(Sentry.setTag).mockReset();
});

describe('themeUsageTimer', () => {
  test('opens a theme.active span tagged with the theme', () => {
    queueSpans(1);

    timer.recordActiveTheme('theme-paper');

    expect(Sentry.setTag).toHaveBeenCalledWith('theme', 'theme-paper');
    expect(Sentry.startInactiveSpan).toHaveBeenCalledWith({
      name: 'theme.active',
      op: 'ui.theme',
      attributes: { theme: 'theme-paper' },
    });
  });

  test('closes the previous segment when the theme changes', () => {
    const [first] = queueSpans(2);

    timer.recordActiveTheme('theme-paper');
    timer.recordActiveTheme('theme-neon');

    expect(first.end).toHaveBeenCalledTimes(1);
    expect(Sentry.startInactiveSpan).toHaveBeenLastCalledWith(
      expect.objectContaining({ attributes: { theme: 'theme-neon' } }),
    );
  });

  test('does not reopen a span when the theme is unchanged', () => {
    queueSpans(1);

    timer.recordActiveTheme('theme-paper');
    timer.recordActiveTheme('theme-paper');

    expect(Sentry.startInactiveSpan).toHaveBeenCalledTimes(1);
  });

  test('suspending ends the segment and resuming reopens one for the same theme', () => {
    const [first] = queueSpans(2);

    timer.recordActiveTheme('theme-wool');
    timer.suspendThemeTimer('hidden');
    expect(first.end).toHaveBeenCalledTimes(1);

    timer.resumeThemeTimer('hidden');
    expect(Sentry.startInactiveSpan).toHaveBeenLastCalledWith(
      expect.objectContaining({ attributes: { theme: 'theme-wool' } }),
    );
  });

  test('stays suspended until every reason is cleared', () => {
    queueSpans(2);

    timer.recordActiveTheme('theme-wool');
    timer.suspendThemeTimer('hidden');
    timer.suspendThemeTimer('game-over');

    // Clearing only one reason must not resume counting.
    timer.resumeThemeTimer('hidden');
    expect(Sentry.startInactiveSpan).toHaveBeenCalledTimes(1);

    // Once the last reason clears, a fresh span opens.
    timer.resumeThemeTimer('game-over');
    expect(Sentry.startInactiveSpan).toHaveBeenCalledTimes(2);
  });

  test('a theme change while suspended does not open a span', () => {
    queueSpans(2);

    timer.recordActiveTheme('theme-paper');
    timer.suspendThemeTimer('game-over');
    timer.recordActiveTheme('theme-neon');

    // Still only the first (pre-suspend) span was opened.
    expect(Sentry.startInactiveSpan).toHaveBeenCalledTimes(1);
    expect(Sentry.setTag).toHaveBeenLastCalledWith('theme', 'theme-neon');
  });
});
