import type { CardAnimationData } from '@/contexts/CardAnimationContext.tsx';
import { getRetreatPileAngle } from '@/lib/retreatPile';
import type { Card, GameState } from '@/types';
import {
  calculateAnimationDuration,
  getBuildPilePosition,
  getRetreatPilePosition,
} from '@/utils/cardPositions';

let globalAnimationContext: {
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string;
} | null = null;

export const setGlobalCompletedPileAnimationContext = (context: typeof globalAnimationContext) => {
  globalAnimationContext = context;
};

export const triggerCompletedBuildPileAnimation = (
  gameState: GameState,
  buildPileIndex: number,
  cards: Card[],
  initialCompletedCount: number,
  staggerDelay: number = 100,
): number => {
  if (!globalAnimationContext) {
    console.warn('Animation context not available for completed build pile animation');
    return 0;
  }

  const animationContext = globalAnimationContext;

  if (cards.length === 0) {
    return 0;
  }

  try {
    const centerAreaElement = document.querySelector<HTMLElement>('.center-area');
    if (!centerAreaElement) {
      console.warn('Center area not found for completed build pile animation');
      return 0;
    }

    const startPosition = getBuildPilePosition(centerAreaElement, buildPileIndex);
    const endPosition = getRetreatPilePosition(centerAreaElement);
    const duration = calculateAnimationDuration(startPosition, endPosition);

    return cards.reduce((maxDuration, card, index) => {
      // Keep completed-pile cards moving one at a time so deck themes with
      // heavy shadows or glass effects do not stack twelve animated cards at
      // the same origin.
      const initialDelay = index * (duration + staggerDelay);

      animationContext.startAnimation({
        card,
        startPosition,
        endPosition,
        startAngleDeg: 0,
        endAngleDeg: getRetreatPileAngle(initialCompletedCount + index),
        animationType: 'complete',
        sourceRevealed: true,
        targetRevealed: true,
        initialDelay,
        duration,
        sourceInfo: {
          playerIndex: gameState.currentPlayerIndex,
          source: 'build',
          index: buildPileIndex,
        },
      });

      return Math.max(maxDuration, duration + initialDelay);
    }, 0);
  } catch (error) {
    console.warn('Completed build pile animation failed:', error);
    return 0;
  }
};
