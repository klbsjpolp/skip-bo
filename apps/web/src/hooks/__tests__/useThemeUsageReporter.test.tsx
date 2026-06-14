import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { recordActiveTheme, resumeThemeTimer, suspendThemeTimer } from '@/monitoring/themeUsageTimer';
import { useThemeUsageGameGate, useThemeUsageReporter } from '../useThemeUsageReporter';

vi.mock('@/monitoring/themeUsageTimer', () => ({
  recordActiveTheme: vi.fn(),
  suspendThemeTimer: vi.fn(),
  resumeThemeTimer: vi.fn(),
}));

let themeValue: string | undefined = 'theme-paper';
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: themeValue }),
}));

const record = vi.mocked(recordActiveTheme);
const suspend = vi.mocked(suspendThemeTimer);
const resume = vi.mocked(resumeThemeTimer);

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  themeValue = 'theme-paper';
  setVisibility('visible');
  vi.clearAllMocks();
});

afterEach(() => {
  setVisibility('visible');
});

function ReporterHarness() {
  useThemeUsageReporter();
  return null;
}

function GateHarness({ isGameOver }: { isGameOver: boolean }) {
  useThemeUsageGameGate(isGameOver);
  return null;
}

describe('useThemeUsageReporter', () => {
  test('records the resolved theme on mount', () => {
    render(<ReporterHarness />);
    expect(record).toHaveBeenCalledWith('theme-paper');
  });

  test('suspends on tab hide and resumes when visible again', () => {
    render(<ReporterHarness />);

    act(() => setVisibility('hidden'));
    expect(suspend).toHaveBeenCalledWith('hidden');

    act(() => setVisibility('visible'));
    expect(resume).toHaveBeenCalledWith('hidden');
  });

  test('suspends on pagehide', () => {
    render(<ReporterHarness />);
    suspend.mockClear();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(suspend).toHaveBeenCalledWith('hidden');
  });

  test('suspends on unmount', () => {
    const { unmount } = render(<ReporterHarness />);
    suspend.mockClear();

    unmount();

    expect(suspend).toHaveBeenCalledWith('hidden');
  });
});

describe('useThemeUsageGameGate', () => {
  test('suspends while the game is over and resumes when a new game starts', () => {
    const { rerender } = render(<GateHarness isGameOver={false} />);
    expect(resume).toHaveBeenLastCalledWith('game-over');

    rerender(<GateHarness isGameOver={true} />);
    expect(suspend).toHaveBeenCalledWith('game-over');

    rerender(<GateHarness isGameOver={false} />);
    expect(resume).toHaveBeenLastCalledWith('game-over');
  });

  test('clears the game-over suspension on unmount', () => {
    const { unmount } = render(<GateHarness isGameOver={true} />);
    resume.mockClear();

    unmount();

    expect(resume).toHaveBeenCalledWith('game-over');
  });
});
