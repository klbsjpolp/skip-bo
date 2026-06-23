import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { themes } from '@/types';
import { trackThemeSelection } from '@/monitoring/themeAnalytics';
import { ThemeSwitcher } from '../ThemeSwitcher';

vi.mock('@/monitoring/themeAnalytics', () => ({
  trackThemeSelection: vi.fn(),
}));

const trackSelection = vi.mocked(trackThemeSelection);

function renderSwitcher() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="theme-paper" themes={themes.map((t) => t.value)}>
      <ThemeSwitcher />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  // next-themes persists the active theme; reset so each test starts on the default.
  window.localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ThemeSwitcher', () => {
  test('flags the rummy theme as new in the dropdown', () => {
    renderSwitcher();

    fireEvent.click(screen.getByTestId('theme-switcher-trigger'));

    const rummyOption = screen.getByTestId('theme-option-theme-rummy');
    expect(within(rummyOption).getByText('Nouveau')).toBeTruthy();

    const paperOption = screen.getByTestId('theme-option-theme-paper');
    expect(within(paperOption).queryByText('Nouveau')).toBeNull();
  });

  test('no longer flags the f1 or cinema themes', () => {
    renderSwitcher();

    fireEvent.click(screen.getByTestId('theme-switcher-trigger'));

    const f1Option = screen.getByTestId('theme-option-theme-f1');
    expect(within(f1Option).queryByText('Nouveau')).toBeNull();

    const cinemaOption = screen.getByTestId('theme-option-theme-cinema');
    expect(within(cinemaOption).queryByText('Amélioré')).toBeNull();
    expect(within(cinemaOption).queryByText('Nouveau')).toBeNull();
  });

  test('reports a manual selection from the dropdown', () => {
    renderSwitcher();

    fireEvent.click(screen.getByTestId('theme-switcher-trigger'));
    fireEvent.click(screen.getByTestId('theme-option-theme-neon'));

    expect(trackSelection).toHaveBeenCalledWith({
      theme: 'theme-neon',
      previousTheme: 'theme-paper',
      source: 'manual',
    });
  });

  test('reports a random selection that differs from the active theme', () => {
    renderSwitcher();

    fireEvent.click(screen.getByTestId('theme-randomizer-button'));

    expect(trackSelection).toHaveBeenCalledTimes(1);
    const call = trackSelection.mock.calls[0][0];
    expect(call.source).toBe('random');
    expect(call.previousTheme).toBe('theme-paper');
    expect(call.theme).not.toBe('theme-paper');
  });
});
