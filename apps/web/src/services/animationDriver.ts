import { useMemo } from 'react';

import type { Card, GameAction, GameState } from '@skipbo/game-core';

import type { CardAnimationData } from '@/contexts/CardAnimationContext';
import { triggerAIAnimation, type TriggerAIAnimationOptions } from '@/services/aiAnimationService';
import { triggerCompletedBuildPileAnimation } from '@/services/completedBuildPileAnimationService';
import { calculateMultipleDrawAnimationDuration, triggerMultipleDrawAnimations } from '@/services/drawAnimationService';

/**
 * The primitives the CardAnimationProvider owns; everything else in the
 * driver is derived from them.
 */
export interface AnimationPrimitives {
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string;
  removeAnimation: (id: string) => void;
  waitForAnimations: () => Promise<void>;
}

/**
 * Explicit handle to the animation system. Owned by CardAnimationProvider and
 * passed to whoever animates — the turn machine receives it as actor input,
 * the online hook passes it into view ingestion. There are no module-global
 * animation slots: without a driver, nothing animates.
 */
export interface AnimationDriver extends AnimationPrimitives {
  /** Animate an AI/opponent play or discard read from the given state. Returns its duration. */
  animateMove: (gameState: GameState, action: GameAction, options?: TriggerAIAnimationOptions) => number;
  /** Animate deck→hand draws with staggered starts. Resolves to the total duration. */
  animateDraws: (
    playerIndex: number,
    cards: Card[],
    handIndices: number[],
    staggerDelay?: number,
    baseDelay?: number,
  ) => Promise<number>;
  /** Duration animateDraws would take, without firing anything. */
  calculateDrawsDuration: (
    playerIndex: number,
    handIndices: number[],
    staggerDelay?: number,
    baseDelay?: number,
  ) => number;
  /** Animate a completed build pile retreating to the completed stack. Returns its total duration. */
  animateCompletion: (
    gameState: GameState,
    buildPileIndex: number,
    cards: Card[],
    initialCompletedCount: number,
    staggerDelay?: number,
    baseDelay?: number,
  ) => number;
}

export const createAnimationDriver = (primitives: AnimationPrimitives): AnimationDriver => ({
  ...primitives,
  animateMove: (gameState, action, options) => triggerAIAnimation(primitives, gameState, action, options),
  animateDraws: (playerIndex, cards, handIndices, staggerDelay, baseDelay) =>
    triggerMultipleDrawAnimations(primitives, playerIndex, cards, handIndices, staggerDelay, baseDelay),
  calculateDrawsDuration: calculateMultipleDrawAnimationDuration,
  animateCompletion: (gameState, buildPileIndex, cards, initialCompletedCount, staggerDelay, baseDelay) =>
    triggerCompletedBuildPileAnimation(
      primitives,
      gameState,
      buildPileIndex,
      cards,
      initialCompletedCount,
      staggerDelay,
      baseDelay,
    ),
});

/** Memoized driver for the CardAnimationProvider (stable while the primitives are). */
export function useAnimationDriver(
  startAnimation: AnimationPrimitives['startAnimation'],
  removeAnimation: AnimationPrimitives['removeAnimation'],
  waitForAnimations: AnimationPrimitives['waitForAnimations'],
): AnimationDriver {
  return useMemo(
    () => createAnimationDriver({ startAnimation, removeAnimation, waitForAnimations }),
    [startAnimation, removeAnimation, waitForAnimations],
  );
}

/** Inert driver for tests and machine defaults: measures nothing, animates nothing. */
export const noopAnimationDriver: AnimationDriver = {
  startAnimation: () => '',
  removeAnimation: () => undefined,
  waitForAnimations: () => Promise.resolve(),
  animateMove: () => 0,
  animateDraws: () => Promise.resolve(0),
  calculateDrawsDuration: () => 0,
  animateCompletion: () => 0,
};
