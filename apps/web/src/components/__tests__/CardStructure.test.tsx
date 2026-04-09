import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Card } from '../Card';

describe('Card structure', () => {
  test('revealed cards expose the decorative corner inset hook', () => {
    const { container } = render(<Card card={{ value: 1, isSkipBo: false }} isRevealed={true} />);

    expect(container.querySelector('.card-inner')).not.toBeNull();
    expect(container.querySelector('.card-inner-2')).not.toBeNull();
    expect(container.querySelector('.card-corner-inset')).not.toBeNull();
    expect(container.querySelector('.card-corner-number')?.textContent).toBe('1');
  });

  test('hidden cards only render their card back', () => {
    const { container } = render(<Card card={{ value: 1, isSkipBo: false }} isRevealed={false} />);

    expect(container.querySelector('.back')).not.toBeNull();
    expect(container.querySelector('.card-corner-inset')).toBeNull();
    expect(container.querySelector('.card-corner-number')).toBeNull();
  });
});
