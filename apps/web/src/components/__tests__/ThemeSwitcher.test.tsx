import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, expect, test } from 'vitest';
import { themes } from '@/types';
import { ThemeSwitcher } from '../ThemeSwitcher';

describe('ThemeSwitcher', () => {
  test('flags the cinema theme as new in the dropdown', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="theme-paper" themes={themes.map((t) => t.value)}>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByTestId('theme-switcher-trigger'));

    const cinemaOption = screen.getByTestId('theme-option-theme-cinema');
    expect(within(cinemaOption).getByText('Nouveau')).toBeTruthy();

    const paperOption = screen.getByTestId('theme-option-theme-paper');
    expect(within(paperOption).queryByText('Nouveau')).toBeNull();
  });
});
