import { GameState, Card } from '@/types';
import { 
  getHandCardPosition, 
  getDeckPosition,
  calculateAnimationDuration 
} from '@/utils/cardPositions';
import { CardAnimationData } from "@/contexts/CardAnimationContext.tsx";

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

  // Wait for the global animation context to be available (fixes timing issue)
  if (!globalAnimationContext) {
    console.log('⏳ Animation context not immediately available, waiting...');
    const contextAvailable = await waitForAnimationContext(2000);
    
    if (!contextAvailable) {
      console.warn('❌ Animation context not available after waiting - animations will be skipped');
      console.warn('   This suggests the useSkipBoGame hook may not be properly setting up the context');
      return 0;
    }
    
    console.log('✅ Animation context became available after waiting');
  } else {
    console.log('✅ Global animation context is immediately available, proceeding with animations');
  }

  // Start all animations simultaneously with staggered start times
  // This prevents cumulative delays - each card appears at a predictable time
  const animationPromises: Promise<void>[] = [];
  let maxDuration = 0;

  for (let i = 0; i < cards.length; i++) {
    const startDelay = i * staggerDelay;

    const animationPromise = new Promise<void>((resolve) => {
      console.log(`🎬 Card ${i+1}/${cards.length} animation STARTING - Card: ${cards[i].value}, Hand Index: ${handIndices[i]}, Delay: ${startDelay}ms`);

      triggerDrawAnimation(
        gameState,
        playerIndex,
        cards[i],
        handIndices[i],
        startDelay
      ).then(({ duration, animationId }) => {
        if (duration > 0 && animationId) {
          console.log(`⏱️ Card ${i + 1}/${cards.length} animation IN PROGRESS - Duration: ${duration}ms, Total time expected: ${startDelay + duration}ms`);

          // Remove animation exactly when it completes to show the card
          setTimeout(() => {
            console.log(`✅ Card ${i + 1}/${cards.length} animation FINISHED - Card: ${cards[i].value} now APPEARING at ${Date.now()}`);
            console.log(`🔄 Removing animation ${animationId} for Card: ${cards[i].value}`);
            globalAnimationContext!.removeAnimation(animationId);
            resolve();
          }, duration);

          // Track the maximum total time for any card
          const totalTimeForThisCard = startDelay + duration;
          if (totalTimeForThisCard > maxDuration) {
            maxDuration = totalTimeForThisCard;
          }
        } else {
          console.log(`❌ Card ${i + 1}/${cards.length} animation FAILED - Card: ${cards[i].value}`);
          resolve();
        }
      });
    });
    
    animationPromises.push(animationPromise);
  }
  
  console.log(`🔄 Starting all ${animationPromises.length} animations independently...`);
  console.log(`📊 Returning duration: 0ms to avoid additional waiting in useSkipBoGame`);
  
  // Don't wait for all animations to complete
  // Each card will appear independently when its animation completes
  // This allows for a more natural staggered appearance
  
  // We still keep track of the animations to ensure they complete properly
  // but we don't make the game logic wait for them
  Promise.all(animationPromises).then(() => {
    console.log(`🏁 All ${animationPromises.length} animations completed in the background`);
  });
  
  // Return 0 duration so useSkipBoGame doesn't wait additionally
  // This allows the game to proceed immediately while animations continue in the background
  return 0;
};