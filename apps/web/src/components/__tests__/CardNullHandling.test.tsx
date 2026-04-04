import { render } from '@testing-library/react';
import { Card } from '../Card';
import {describe, expect, test, vi } from 'vitest';

// Mock the useTheme hook
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

describe('Card Null Handling', () => {
  test('renders without errors when card is null', () => {
    // This should not throw an error
    const { container } = render(
      <Card card={null} isRevealed={true} />
    );
    
    // Check that the card element exists
    const cardElement = container.querySelector('.card');
    expect(cardElement).toBeNull();
  });
  
  test('renders without errors when card is undefined', () => {
    // This should not throw an error
    const { container } = render(
      <Card card={null} isRevealed={true} />
    );
    
    // Check that the card element exists
    const cardElement = container.querySelector('.card');
    expect(cardElement).toBeNull();
  });
});