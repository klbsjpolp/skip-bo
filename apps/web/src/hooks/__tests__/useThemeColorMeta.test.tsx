import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useThemeColorMeta } from '../useThemeColorMeta';

let resolvedTheme: string | undefined = 'metro';
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme }),
}));

function Harness() {
  useThemeColorMeta();
  return null;
}

/** The hook defers to rAF; run the callback inline so `render` is enough. */
function runFramesSynchronously() {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
}

function setTokens(tokens: { themeColor?: string; background?: string }) {
  const root = document.documentElement;
  root.style.removeProperty('--theme-color');
  root.style.removeProperty('--background');
  if (tokens.themeColor) root.style.setProperty('--theme-color', tokens.themeColor);
  if (tokens.background) root.style.setProperty('--background', tokens.background);
}

const metaContent = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;

beforeEach(() => {
  resolvedTheme = 'metro';
  runFramesSynchronously();
  document.querySelector('meta[name="theme-color"]')?.remove();
  setTokens({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  setTokens({});
});

describe('useThemeColorMeta', () => {
  test('publishes the theme-color token and creates the meta tag', () => {
    setTokens({ themeColor: '#234f52', background: '#086b6e' });

    render(<Harness />);

    expect(metaContent(), 'a theme that tints the page wins over the board colour').toBe('#234f52');
  });

  test('falls back to the board background when the theme sets no page tint', () => {
    // Only Metro splits the two; every other theme leaves `--theme-color` unset
    // and must still get its own background in the status bar.
    setTokens({ background: '#0a0a0a' });

    render(<Harness />);

    expect(metaContent()).toBe('#0a0a0a');
  });

  test('reuses an existing meta tag rather than appending a second one', () => {
    const existing = document.createElement('meta');
    existing.name = 'theme-color';
    existing.content = '#stale';
    document.head.appendChild(existing);
    setTokens({ background: '#f1e7cc' });

    render(<Harness />);

    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(existing.content).toBe('#f1e7cc');
  });

  test('leaves the meta tag alone when neither token resolves', () => {
    render(<Harness />);

    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });

  test('cancels the pending frame on unmount', () => {
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 42);
    vi.stubGlobal('cancelAnimationFrame', cancel);

    render(<Harness />).unmount();

    expect(cancel).toHaveBeenCalledWith(42);
  });
});
