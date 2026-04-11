import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnimatedCard } from '@/components/AnimatedCard';
import type { CardAnimationData } from '@/contexts/CardAnimationContext';

const createAnimation = (initialDelay: number): CardAnimationData => ({
  id: `animated-card-${initialDelay}`,
  card: { value: 7, isSkipBo: false },
  startPosition: { x: 10, y: 10 },
  endPosition: { x: 100, y: 100 },
  animationType: 'complete',
  sourceRevealed: true,
  targetRevealed: true,
  initialDelay,
  duration: 300,
  sourceInfo: {
    playerIndex: 0,
    source: 'build',
    index: 0,
  },
});

describe('AnimatedCard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden until its initial delay elapses', () => {
    vi.useFakeTimers();

    const { container } = render(<AnimatedCard animation={createAnimation(200)} />);

    expect(container.querySelector('.animated-card')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(199);
    });

    expect(container.querySelector('.animated-card')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(container.querySelector('.animated-card')).not.toBeNull();
  });
});
