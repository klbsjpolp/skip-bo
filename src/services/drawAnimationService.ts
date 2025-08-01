import {Card, GameState} from '@/types';
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
const waitForAnimationContext = async (maxWaitTime: number = 2000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (!globalAnimationContext && (Date.now() - startTime) < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms before checking again
  }
  
  return globalAnimationContext !== null;
};

// Function to trigger draw animations from deck to hand
const triggerDrawAnimation = async (
  gameState: GameState,
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

    const player = gameState.players[playerIndex];
    const isOverlapping = player.hand.length > 4;
    const endPosition = getHandCardPosition(handContainer, handIndex, isOverlapping);

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

    return { duration, animationId };
  } catch (error) {
    console.warn('Draw animation failed:', error);
  }

  return { duration: 0, animationId: '' };
};

// Function to trigger multiple draw animations with staggered start times (no cumulative delays)
export const triggerMultipleDrawAnimations = async (
  gameState: GameState,
  playerIndex: number,
  cards: Card[],
  handIndices: number[],
  staggerDelay: number = 100
): Promise<number> => {
  console.log(`🎯 triggerMultipleDrawAnimations called for player ${playerIndex} with ${cards.length} cards`);
  
  if (cards.length !== handIndices.length) {
    console.warn('Cards and hand indices arrays must have the same length');
    return 0;
  }

  // If no cards, return immediately
  if (cards.length === 0) {
    return 0;
  }

  if (!globalAnimationContext)
    await waitForAnimationContext();

  // Check if animation context is available (non-blocking)
  if (!globalAnimationContext) {
    console.log('⏳ Animation context not available - using fallback duration calculation');
    // Return estimated duration without waiting for context
    const estimatedAnimationDuration = 300;
    const maxExpectedDuration = ((cards.length - 1) * staggerDelay) + estimatedAnimationDuration;
    console.log(`🚀 Returning estimated duration: ${maxExpectedDuration}ms`);
    return maxExpectedDuration;
  }

  console.log('✅ Global animation context is available, proceeding with animations');

  // Calculate expected duration and trigger animations
  let maxDuration = 0;
  const animationPromises: Promise<void>[] = [];

  for (let i = 0; i < cards.length; i++) {
    const startDelay = i * staggerDelay;

    console.log(`🎬 Card ${i+1}/${cards.length} animation STARTING - Card: ${cards[i].value}, Hand Index: ${handIndices[i]}, Delay: ${startDelay}ms`);

    // Create a promise for this animation that doesn't block the return
    const animationPromise = triggerDrawAnimation(
      gameState,
      playerIndex,
      cards[i],
      handIndices[i],
      startDelay
    ).then(({ duration, animationId }) => {
      if (duration > 0 && animationId) {
        console.log(`⏱️ Card ${i + 1}/${cards.length} animation IN PROGRESS - Duration: ${duration}ms, Total time expected: ${startDelay + duration}ms`);

        // Set up completion handler
        setTimeout(() => {
          console.log(`✅ Card ${i + 1}/${cards.length} animation FINISHED - Card: ${cards[i].value} now APPEARING`);
          console.log(`🔄 Removing animation ${animationId} for Card: ${cards[i].value}`);
          globalAnimationContext!.removeAnimation(animationId);
        }, duration);

        // Update max duration with actual calculated duration
        const totalDuration = startDelay + duration;
        maxDuration = Math.max(maxDuration, totalDuration);
      } else {
        console.log(`❌ Card ${i + 1}/${cards.length} animation FAILED - Card: ${cards[i].value}`);
      }
    }).catch((error) => {
      console.warn(`Animation setup failed for card ${cards[i].value}:`, error);
    });

    animationPromises.push(animationPromise);

    // Also calculate estimated duration as fallback
    const estimatedAnimationDuration = 300;
    const expectedTotalDuration = startDelay + estimatedAnimationDuration;
    maxDuration = Math.max(maxDuration, expectedTotalDuration);
  }

  console.log(`🚀 All ${cards.length} animations STARTED - Estimated total duration: ${maxDuration}ms`);

  // Don't await - let animations run in background
  // Track completion for logging only
  Promise.all(animationPromises).then(() => {
    console.log(`🏁 All ${cards.length} animations completed in the background`);
  }).catch((error) => {
    console.warn('Some animations failed:', error);
  });

  return maxDuration;
};