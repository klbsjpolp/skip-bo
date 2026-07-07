import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { CardAnimationData } from '@/contexts/CardAnimationContext';
import { soundForAnimation } from '@/sound/soundForAnimation';
import { VictoryEffects } from '@/components/VictoryEffects';
import * as controller from '@/sound/controller';

const baseAnim = (overrides: Partial<CardAnimationData>): CardAnimationData => ({
  id: 'a1',
  card: { value: 5, isSkipBo: false },
  startPosition: { x: 0, y: 0 },
  endPosition: { x: 10, y: 10 },
  animationType: 'play',
  sourceRevealed: true,
  targetRevealed: true,
  initialDelay: 0,
  duration: 100,
  sourceInfo: { playerIndex: 0, source: 'hand', index: 0 },
  ...overrides,
});

describe('soundForAnimation mapping', () => {
  it('maps a normal play to build-snap', () => {
    expect(soundForAnimation(baseAnim({ animationType: 'play' }))).toBe('build-snap');
  });

  it('maps a Skip-Bo play to skipbo-accent', () => {
    expect(soundForAnimation(baseAnim({ animationType: 'play', card: { value: 0, isSkipBo: true } }))).toBe(
      'skipbo-accent',
    );
  });

  it('maps discard and draw to their events', () => {
    expect(soundForAnimation(baseAnim({ animationType: 'discard' }))).toBe('discard');
    expect(soundForAnimation(baseAnim({ animationType: 'draw' }))).toBe('draw');
  });

  it('does not sound pile-completion retreats per card', () => {
    expect(soundForAnimation(baseAnim({ animationType: 'complete' }))).toBeNull();
  });
});

describe('VictoryEffects sound', () => {
  beforeEach(() => {
    vi.spyOn(controller, 'playSound').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('plays the victory fanfare once on mount', () => {
    render(<VictoryEffects />);
    expect(controller.playSound).toHaveBeenCalledTimes(1);
    expect(controller.playSound).toHaveBeenCalledWith('victory');
  });
});
