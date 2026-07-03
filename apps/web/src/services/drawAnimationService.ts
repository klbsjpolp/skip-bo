import type { Card } from '@skipbo/game-core';
import {
  calculateAnimationDuration,
  getDeckPosition,
  getHandCardAngle,
  getHandSlotLayoutPosition,
} from '@/utils/cardPositions';
import type { CardAnimationData } from '@/contexts/CardAnimationContext.tsx';

type DrawAnimationPrimitives = { startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string };

const getDrawAnimationMetrics = (
  playerIndex: number,
  handIndex: number,
): {
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  endAngleDeg: number;
  duration: number;
} | null => {
  try {
    const playerAreaElement = document.querySelector<HTMLElement>(`.player-area[data-player-index="${playerIndex}"]`);
    const centerAreaElement = document.querySelector('.center-area') as HTMLElement;

    if (!playerAreaElement || !centerAreaElement) {
      console.warn('Required DOM elements not found for draw animation');
      return null;
    }

    // Calculate start position (deck)
    const startPosition = getDeckPosition(centerAreaElement);

    // Calculate end position (hand slot)
    const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
    if (!handContainer) {
      console.warn('Hand container not found for draw animation');
      return null;
    }

    const endPosition = getHandSlotLayoutPosition(handContainer, handIndex);
    const endAngleDeg = getHandCardAngle(handContainer, handIndex);
    const duration = calculateAnimationDuration(startPosition, endPosition);

    return {
      startPosition,
      endPosition,
      endAngleDeg,
      duration,
    };
  } catch (error) {
    console.warn('Draw animation failed:', error);
    return null;
  }
};

const triggerDrawAnimation = (
  anim: DrawAnimationPrimitives,
  playerIndex: number,
  card: Card,
  handIndex: number,
  initialDelay: number = 0,
): { duration: number; animationId: string } => {
  const metrics = getDrawAnimationMetrics(playerIndex, handIndex);
  if (!metrics) {
    return { duration: 0, animationId: '' };
  }

  try {
    const animationId = anim.startAnimation({
      card,
      startPosition: metrics.startPosition,
      endPosition: metrics.endPosition,
      endAngleDeg: metrics.endAngleDeg,
      sourceRevealed: false, // Cards drawn from deck are face-down
      targetRevealed: playerIndex === 0, // Reveal to human player only
      animationType: 'draw',
      initialDelay,
      duration: metrics.duration,
      sourceInfo: {
        playerIndex,
        source: 'deck',
        index: handIndex, // For draw animations, store the destination hand index
        discardPileIndex: undefined,
      },
    });

    return { duration: metrics.duration + initialDelay, animationId };
  } catch (error) {
    console.warn('Draw animation failed:', error);
  }

  return { duration: 0, animationId: '' };
};

export const calculateMultipleDrawAnimationDuration = (
  playerIndex: number,
  handIndices: number[],
  staggerDelay: number = 500,
  baseDelay: number = 0,
): number =>
  handIndices.reduce((maxDuration, handIndex, index) => {
    const metrics = getDrawAnimationMetrics(playerIndex, handIndex);
    if (!metrics) {
      return maxDuration;
    }

    return Math.max(maxDuration, metrics.duration + baseDelay + index * staggerDelay);
  }, 0);

// Function to trigger multiple draw animations with staggered start times (no cumulative delays)
export const triggerMultipleDrawAnimations = async (
  anim: DrawAnimationPrimitives,
  playerIndex: number,
  cards: Card[],
  handIndices: number[],
  staggerDelay: number = 500,
  baseDelay: number = 0,
): Promise<number> => {
  if (cards.length !== handIndices.length) {
    console.warn('Cards and hand indices arrays must have the same length');
    return 0;
  }

  if (cards.length === 0) {
    return 0;
  }

  const animationResults = cards.map((card, index) => {
    const initialDelay = baseDelay + index * staggerDelay;
    return triggerDrawAnimation(anim, playerIndex, card, handIndices[index], initialDelay);
  });

  try {
    const totalDuration = animationResults.map((result) => result.duration).reduce((a, b) => (a > b ? a : b), 0);

    return totalDuration;
  } catch (error) {
    console.error('Error triggering one or more draw animations:', error);
    return 0;
  }
};
