import { render, waitFor } from '@testing-library/react';
import { act, useEffect } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  CardAnimationProvider,
  type AnimationContextType,
} from '@/contexts/CardAnimationContext.tsx';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';

function ContextProbe({ onReady }: { onReady: (context: AnimationContextType) => void }) {
  const context = useCardAnimation();

  useEffect(() => {
    onReady(context);
  }, [context, onReady]);

  return null;
}

describe('CardAnimationProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for animations started in the same tick', async () => {
    let context: AnimationContextType | undefined;

    render(
      <CardAnimationProvider>
        <ContextProbe onReady={(nextContext) => {
          context = nextContext;
        }}
        />
      </CardAnimationProvider>,
    );

    await waitFor(() => expect(context).toBeDefined());

    let resolved = false;
    let animId: string | undefined;

    act(() => {
      animId = context!.startAnimation({
        card: { value: 12, isSkipBo: false },
        startPosition: { x: 0, y: 0 },
        endPosition: { x: 40, y: 40 },
        animationType: 'play',
        sourceRevealed: true,
        targetRevealed: true,
        initialDelay: 0,
        duration: 120,
        sourceInfo: {
          playerIndex: 0,
          source: 'hand',
          index: 0,
        },
      });
    });

    const waitPromise = context!.waitForAnimations().then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    // Simulate AnimatedCard calling removeAnimation when its WAAPI animation finishes
    act(() => {
      context!.removeAnimation(animId!);
    });

    await waitPromise;

    expect(resolved).toBe(true);
  });
});
