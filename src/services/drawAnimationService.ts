import type {Card} from '@/types';
import {
  calculateAnimationDuration,
  getDeckPosition,
  getHandCardAngle,
  getHandCardPosition
} from '@/utils/cardPositions';
import type {CardAnimationData} from "@/contexts/CardAnimationContext.tsx";

// Global reference to the animation context
let globalAnimationContext: {
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string;
  removeAnimation: (id: string) => void;
} | null = null;

// Function to set the global animation context (called from React component)
export const setGlobalDrawAnimationContext = (context: typeof globalAnimationContext) => {
  globalAnimationContext = context;
};

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
    // Get the correct player area based on player index
    // Note: DOM order is AI (index 0), Human (index 1), but playerIndex is Human=0, AI=1
    const playerAreas = document.querySelectorAll('.player-area');
    const domIndex = playerIndex === 0 ? 1 : 0; // Human=1, AI=0 in DOM
    const playerAreaElement = playerAreas[domIndex] as HTMLElement;
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

    const endPosition = getHandCardPosition(handContainer, handIndex);
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
  playerIndex: number,
  card: Card,
  handIndex: number,
  initialDelay: number = 0
): { duration: number; animationId: string } => {
  if (!globalAnimationContext) {
    console.warn('Animation context not available for draw action');
    return { duration: 0, animationId: '' };
  }

  const metrics = getDrawAnimationMetrics(playerIndex, handIndex);
  if (!metrics) {
    return { duration: 0, animationId: '' };
  }

  try {
    const animationId = globalAnimationContext.startAnimation({
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
    return triggerDrawAnimation(playerIndex, card, handIndices[index], initialDelay);
  });

  try {
    const totalDuration = animationResults
      .map(result => result.duration)
      .reduce((a, b) => a > b ? a : b, 0);

    return totalDuration;
  } catch (error) {
    console.error('Error triggering one or more draw animations:', error);
    return 0;
  }
};
