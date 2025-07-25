import { render } from '@testing-library/react';
import { Card } from '../Card';
import { describe, expect, test } from 'vitest';

describe('Card Angle', () => {
  test('cards have correct rotation when overlapIndex is provided', () => {
    // Render cards with different overlap indices
    const { container: container0 } = render(
      <Card card={{ value: 1, isSkipBo: false }} overlapIndex={0} />
    );
    const { container: container1 } = render(
      <Card card={{ value: 2, isSkipBo: false }} overlapIndex={1} />
    );
    const { container: container2 } = render(
      <Card card={{ value: 3, isSkipBo: false }} overlapIndex={2} />
    );
    const { container: container3 } = render(
      <Card card={{ value: 4, isSkipBo: false }} overlapIndex={3} />
    );
    const { container: container4 } = render(
      <Card card={{ value: 5, isSkipBo: false }} overlapIndex={4} />
    );

    // Get the card elements
    const card0 = container0.querySelector('.card') as HTMLElement;
    const card1 = container1.querySelector('.card') as HTMLElement;
    const card2 = container2.querySelector('.card') as HTMLElement;
    const card3 = container3.querySelector('.card') as HTMLElement;
    const card4 = container4.querySelector('.card') as HTMLElement;

    // Check if the cards have the correct CSS custom property for rotation
    expect(card0.style.getPropertyValue('--card-rotate')).toMatchInlineSnapshot(`"-8deg"`);
    expect(card1.style.getPropertyValue('--card-rotate')).toMatchInlineSnapshot(`"-4deg"`);
    expect(card2.style.getPropertyValue('--card-rotate')).toMatchInlineSnapshot(`"0deg"`);
    expect(card3.style.getPropertyValue('--card-rotate')).toMatchInlineSnapshot(`"4deg"`);
    expect(card4.style.getPropertyValue('--card-rotate')).toMatchInlineSnapshot(`"8deg"`);

    // Check if the cards have the correct left positions
    expect(card0.style.left).toBe('0px');
    expect(card1.style.left).toBe('60px');
    expect(card2.style.left).toBe('120px');
    expect(card3.style.left).toBe('180px');
    expect(card4.style.left).toBe('240px');
  });

  test('cards do not have rotation when stackIndex is provided instead', () => {
    // Render a card with stackIndex
    const { container } = render(
      <Card card={{ value: 1, isSkipBo: false }} stackIndex={2} />
    );

    // Get the card element
    const card = container.querySelector('.card') as HTMLElement;

    // Check that the card has the correct top position but no transform
    expect(card.style.top).toBe('40px');
    expect(card.style.transform).toBe('');
  });
});