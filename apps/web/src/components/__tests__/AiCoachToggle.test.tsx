import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, test, vi} from 'vitest';

import {AiCoachToggle} from '@/components/AiCoachToggle';

describe('AiCoachToggle', () => {
  test('renders as pressed when automatic coach is enabled', () => {
    render(
      <AiCoachToggle
        enabled={true}
        onEnabledChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', {name: 'Désactiver le coach automatique'}).getAttribute('aria-pressed')).toBe('true');
  });

  test('calls onEnabledChange with the next toggle state', () => {
    const onEnabledChange = vi.fn();

    render(
      <AiCoachToggle
        enabled={false}
        onEnabledChange={onEnabledChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Activer le coach automatique'}));

    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });
});
