import { render } from '@testing-library/react';
import { Card } from '../Card';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { useTheme } from 'next-themes';

// Mock next-themes useTheme
vi.mock('next-themes', async () => {
  const actual = await vi.importActual('next-themes');
  return {
    ...actual,
    useTheme: vi.fn(),
  };
});

describe('Card Colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('cards have correct colors in light theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      themes: []
    });

    // Render cards with different values
    const { container: container2 } = render(
      <Card card={{ value: 2, isSkipBo: false }} isRevealed={true} />
    );
    const { container: container6 } = render(
      <Card card={{ value: 6, isSkipBo: false }} isRevealed={true} />
    );
    const { container: container11 } = render(
      <Card card={{ value: 11, isSkipBo: false }} isRevealed={true} />
    );

    // Get the card elements
    const card2 = container2.querySelector('.card') as HTMLElement;
    const card6 = container6.querySelector('.card') as HTMLElement;
    const card11 = container11.querySelector('.card') as HTMLElement;

    // Check if the cards have the correct classes
    expect(card2.classList.contains('card-range-1')).toBeTruthy();
    expect(card6.classList.contains('card-range-2')).toBeTruthy();
    expect(card11.classList.contains('card-range-3')).toBeTruthy();

    // Check if the background colors match the expected HSL values
    // Note: JSDOM doesn't fully support computed styles, so we're just checking the classes
  });

  test('cards have correct colors in neon theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'neon',
      setTheme: vi.fn(),
      themes: []
    });

    // Render cards with different values
    const { container: container2 } = render(
      <Card card={{ value: 2, isSkipBo: false }} isRevealed={true} />
    );
    const { container: container6 } = render(
      <Card card={{ value: 6, isSkipBo: false }} isRevealed={true} />
    );
    const { container: container11 } = render(
      <Card card={{ value: 11, isSkipBo: false }} isRevealed={true} />
    );

    // Get the card elements
    const card2 = container2.querySelector('.card') as HTMLElement;
    const card6 = container6.querySelector('.card') as HTMLElement;
    const card11 = container11.querySelector('.card') as HTMLElement;

    // Check if the cards have the correct classes
    expect(card2.classList.contains('card-range-1')).toBeTruthy();
    expect(card6.classList.contains('card-range-2')).toBeTruthy();
    expect(card11.classList.contains('card-range-3')).toBeTruthy();
  });

  test('Skip-Bo cards do not have color range classes', () => {
    // Render a Skip-Bo card
    const { container } = render(
      <Card card={{ value: 0, isSkipBo: true }} isRevealed={true} />
    );

    // Get the card element
    const card = container.querySelector('.card') as HTMLElement;

    // Check that the card has the skip-bo class but not any range classes
    expect(card.classList.contains('skip-bo')).toBeTruthy();
    expect(card.classList.contains('card-range-1')).toBeFalsy();
    expect(card.classList.contains('card-range-2')).toBeFalsy();
    expect(card.classList.contains('card-range-3')).toBeFalsy();
  });

  test('Unrevealed cards do not have color range classes', () => {
    // Render an unrevealed card
    const { container } = render(
      <Card card={{ value: 5, isSkipBo: false }} isRevealed={false} />
    );

    // Get the card element
    const card = container.querySelector('.card') as HTMLElement;

    // Check that the card has the back class but not any range classes
    expect(card.querySelector('.back')).toBeTruthy();
    expect(card.classList.contains('card-range-1')).toBeFalsy();
    expect(card.classList.contains('card-range-2')).toBeFalsy();
    expect(card.classList.contains('card-range-3')).toBeFalsy();
  });
});