import { afterEach, describe, expect, test, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { tagActiveTheme, trackThemeSelection } from '../themeAnalytics';

vi.mock('@sentry/react', () => ({
  setTag: vi.fn(),
  captureMessage: vi.fn(),
}));

const setTag = vi.mocked(Sentry.setTag);
const captureMessage = vi.mocked(Sentry.captureMessage);

afterEach(() => {
  vi.clearAllMocks();
});

describe('tagActiveTheme', () => {
  test('tags the scope without emitting an event', () => {
    tagActiveTheme('theme-midnight');

    expect(setTag).toHaveBeenCalledWith('theme', 'theme-midnight');
    expect(captureMessage).not.toHaveBeenCalled();
  });
});

describe('trackThemeSelection', () => {
  test('tags the scope and emits a tagged theme.selected message', () => {
    trackThemeSelection({ theme: 'theme-neon', previousTheme: 'theme-paper', source: 'manual' });

    expect(setTag).toHaveBeenCalledWith('theme', 'theme-neon');
    expect(captureMessage).toHaveBeenCalledWith('theme.selected', {
      level: 'info',
      tags: { theme: 'theme-neon', 'theme.source': 'manual' },
      extra: { previousTheme: 'theme-paper' },
    });
  });

  test('records the random source and null previous theme', () => {
    trackThemeSelection({ theme: 'theme-wool', source: 'random' });

    expect(captureMessage).toHaveBeenCalledWith(
      'theme.selected',
      expect.objectContaining({
        tags: { theme: 'theme-wool', 'theme.source': 'random' },
        extra: { previousTheme: null },
      }),
    );
  });
});
