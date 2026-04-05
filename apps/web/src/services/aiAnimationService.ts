import type { GameState, Card } from '@/types';
import type { GameAction } from '@/state/gameActions';
import {
  getHandCardPosition,
  getStockCardPosition,
  getBuildPilePosition,
  calculateAnimationDuration, getHandCardAngle, getNextDiscardCardPosition
} from '@/utils/cardPositions';
import type {CardAnimationData} from "@/contexts/CardAnimationContext.tsx";

interface TriggerAIAnimationOptions {
  cardOverride?: Card;
  sourceRevealedOverride?: boolean;
  targetSettledInStateOverride?: boolean;
  targetRevealedOverride?: boolean;
}

// Global reference to the animation context
let globalAnimationContext: {
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => void;
  waitForAnimations: () => Promise<void>;
} | null = null;

// Function to set the global animation context (called from React component)
export const setGlobalAnimationContext = (context: typeof globalAnimationContext) => {
  globalAnimationContext = context;
};

// Function to trigger AI animations
export const triggerAIAnimation = async (
  gameState: GameState, 
  action: GameAction,
  options: TriggerAIAnimationOptions = {},
): Promise<number> => {
  if (!globalAnimationContext) {
    console.warn('Animation context not available for AI action');
    return 0;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer.isAI) {
    return 0; // Only animate AI actions
  }

  try {
    // Get the correct player area based on current player index
    // Note: DOM order is AI (index 0), Human (index 1), but playerIndex is Human=0, AI=1
    const playerAreas = document.querySelectorAll('.player-area');
    const domIndex = gameState.currentPlayerIndex === 0 ? 1 : 0; // Human=1, AI=0 in DOM
    const playerAreaElement = playerAreas[domIndex] as HTMLElement;
    const centerAreaElement = document.querySelector('.center-area') as HTMLElement;

    if (!playerAreaElement || !centerAreaElement) {
      console.warn('Required DOM elements not found for AI animation');
      return 0;
    }

    let startPosition: { x: number; y: number } | undefined;
    let endPosition: { x: number; y: number } | undefined;
    let animationType: 'play' | 'discard' | 'draw' = 'play';
    let animationCard: Card | undefined;
    let startAngleDeg: number | undefined;
    let targetInfo:
      | {
          playerIndex: number;
          source: 'build';
          index: number;
        }
      | {
          playerIndex: number;
          source: 'discard';
          index: number;
          discardPileIndex: number;
        }
      | undefined;

    if (action.type === 'PLAY_CARD' && gameState.selectedCard) {
      // AI is playing a card
      animationCard = options.cardOverride ?? gameState.selectedCard.card;
      animationType = 'play';

      // Calculate start position based on source
      if (gameState.selectedCard.source === 'hand') {
        const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
        if (handContainer) {
          startPosition = getHandCardPosition(handContainer, gameState.selectedCard.index);
          startAngleDeg = getHandCardAngle(handContainer, gameState.selectedCard.index);
        }
      } else if (gameState.selectedCard.source === 'stock') {
        const stockContainer = playerAreaElement.querySelector('.stock-pile') as HTMLElement;
        if (stockContainer) {
          startPosition = getStockCardPosition(stockContainer);
        }
      } else if (gameState.selectedCard.source === 'discard') {
        const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
        if (discardContainer && gameState.selectedCard.discardPileIndex !== undefined) {
          startPosition = getNextDiscardCardPosition(discardContainer, gameState.selectedCard.discardPileIndex);
        }
      }

      // Calculate end position (build pile)
      endPosition = getBuildPilePosition(centerAreaElement, action.buildPile);
      targetInfo = {
        playerIndex: gameState.currentPlayerIndex,
        source: 'build',
        index: action.buildPile,
      };
    } else if (action.type === 'DISCARD_CARD' && gameState.selectedCard) {
      // AI is discarding a card
      animationCard = options.cardOverride ?? gameState.selectedCard.card;
      animationType = 'discard';

      // Calculate start position (hand card)
      const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
      if (handContainer) {
        startPosition = getHandCardPosition(handContainer, gameState.selectedCard.index);
        startAngleDeg = getHandCardAngle(handContainer, gameState.selectedCard.index);
      }

      // Calculate end position (discard pile)
      const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
      if (discardContainer) {
        endPosition = getNextDiscardCardPosition(discardContainer, action.discardPile);
        targetInfo = {
          playerIndex: gameState.currentPlayerIndex,
          source: 'discard',
          index: action.discardPile,
          discardPileIndex: action.discardPile,
        };
      }
    }

    if (startPosition && endPosition && animationCard) {
      const duration = calculateAnimationDuration(startPosition, endPosition);
      
      globalAnimationContext.startAnimation({
        card: animationCard,
        startPosition,
        endPosition,
        startAngleDeg,
        animationType,
        sourceRevealed: options.sourceRevealedOverride ?? ((animationType === 'play' && gameState.selectedCard?.source !== 'hand') || (animationType === 'discard' && false)), // Hand cards are revealed, stock/discard are not
        targetSettledInState: options.targetSettledInStateOverride ?? false,
        targetRevealed: options.targetRevealedOverride ?? true, // Cards played or discarded by AI are revealed to human
        initialDelay: 0,
        duration,
        sourceInfo: {
          playerIndex: gameState.currentPlayerIndex,
          source: gameState.selectedCard!.source,
          index: gameState.selectedCard!.index,
          discardPileIndex: gameState.selectedCard!.discardPileIndex,
        },
        targetInfo,
      });

      return duration;
    }
  } catch (error) {
    console.warn('AI animation failed:', error);
  }

  return 0;
};
