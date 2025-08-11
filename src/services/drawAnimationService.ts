import {Card} from '@/types';
import {calculateAnimationDuration, getDeckPosition, getHandCardPosition} from '@/utils/cardPositions';
import {CardAnimationData} from "@/contexts/CardAnimationContext.tsx";

// Global reference to the animation context
let globalAnimationContext: {
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string;
  removeAnimation: (id: string) => void;
} | null = null;

// Function to set the global animation context (called from React component)
export const setGlobalDrawAnimationContext = (context: typeof globalAnimationContext) => {
  globalAnimationContext = context;
  console.log('🔧 Global draw animation context set up:', context ? 'SUCCESS' : 'NULL');
};

// Helper function to wait for the global animation context to be available
// Function to trigger draw animations from deck to hand
const triggerDrawAnimation = async (
  playerIndex: number,
  card: Card,
  handIndex: number,
  initialDelay: number = 0
): Promise<{ duration: number; animationId: string }> => {
  if (!globalAnimationContext) {
    console.warn('Animation context not available for draw action');
    return { duration: 0, animationId: '' };
  }

  try {
    // Get the correct player area based on player index
    // Note: DOM order is AI (index 0), Human (index 1), but playerIndex is Human=0, AI=1
    const playerAreas = document.querySelectorAll('.player-area');
    const domIndex = playerIndex === 0 ? 1 : 0; // Human=1, AI=0 in DOM
    const playerAreaElement = playerAreas[domIndex] as HTMLElement;
    const centerAreaElement = document.querySelector('.center-area') as HTMLElement;

    if (!playerAreaElement || !centerAreaElement) {
      console.warn('Required DOM elements not found for draw animation');
      return { duration: 0, animationId: '' };
    }

    // Calculate start position (deck)
    const startPosition = getDeckPosition(centerAreaElement);

    // Calculate end position (hand slot)
    const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
    if (!handContainer) {
      console.warn('Hand container not found for draw animation');
      return { duration: 0, animationId: '' };
    }

    const endPosition = getHandCardPosition(handContainer, handIndex);

    const duration = calculateAnimationDuration(startPosition, endPosition);
    
    const animationId = globalAnimationContext.startAnimation({
      card,
      startPosition,
      endPosition,
      animationType: 'draw',
      initialDelay,
      duration,
      sourceInfo: {
        playerIndex,
        source: 'deck',
        index: handIndex, // For draw animations, store the destination hand index
        discardPileIndex: undefined,
      },
    });

    return { duration: duration + initialDelay, animationId };
  } catch (error) {
    console.warn('Draw animation failed:', error);
  }

  return { duration: 0, animationId: '' };
};

// Function to trigger multiple draw animations with staggered start times (no cumulative delays)
export const triggerMultipleDrawAnimations = async (
  playerIndex: number,
  cards: Card[],
  handIndices: number[],
  staggerDelay: number = 500
): Promise<number> => {
  console.log(`🎯 triggerMultipleDrawAnimations called for player ${playerIndex} with ${cards.length} cards`);
  
  if (cards.length !== handIndices.length) {
    console.warn('Cards and hand indices arrays must have the same length');
    return 0;
  }

  if (cards.length === 0) {
    return 0;
  }

  const animationPromises = cards.map((card, index) => {
    const initialDelay = index * staggerDelay;
    return triggerDrawAnimation(playerIndex, card, handIndices[index], initialDelay);
  });

  try {
    const results = await Promise.all(animationPromises);

    const totalDuration = results.map(result => result.duration).reduce((a, b) => a > b ? a : b, 0);

    console.log(`✅ triggerMultipleDrawAnimations: All ${cards.length} animations triggered. Total estimated duration: ${totalDuration}ms`);
    return totalDuration;

  } catch (error) {
    console.error('Error triggering one or more draw animations:', error);
    return 0;
  }
};