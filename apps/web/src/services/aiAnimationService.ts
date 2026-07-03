import type { GameState, Card } from '@skipbo/game-core';
import type { GameAction } from '@skipbo/game-core';
import {
  getDiscardTopCardPosition,
  getHandCardPosition,
  getStockCardPosition,
  getBuildPilePosition,
  calculateAnimationDuration,
  getHandCardAngle,
  getNextDiscardCardPosition,
} from '@/utils/cardPositions';
import type { CardAnimationData } from '@/contexts/CardAnimationContext.tsx';

export interface TriggerAIAnimationOptions {
  cardOverride?: Card;
  sourceRevealedOverride?: boolean;
  targetSettledInStateOverride?: boolean;
  targetPileLengthOverride?: number;
  targetRevealedOverride?: boolean;
}

// Function to trigger AI animations.
//
// This function is intentionally synchronous: it reads DOM layout, registers a
// single animation with the global animation context, and returns the computed
// duration. Callers rely on synchronous behavior to register follow-up
// animations (e.g. completion retreat, hand refill draws) in the SAME tick so
// React commits them all in one render. Introducing a microtask boundary here
// causes a one-frame flash where the play animation is registered against a
// view that already shows completion side-effects (e.g. the 12 backdrop on a
// just-cleared build pile, or completed cards leaking onto the retreat pile).
// See useOnlineSkipBoGame snapshot handling for the call site that depends on
// this contract.
export const triggerAIAnimation = (
  anim: { startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string },
  gameState: GameState,
  action: GameAction,
  options: TriggerAIAnimationOptions = {},
): number => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer.isAI) {
    return 0; // Only animate AI actions
  }

  try {
    const playerAreaElement = document.querySelector<HTMLElement>(
      `.player-area[data-player-index="${gameState.currentPlayerIndex}"]`,
    );
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
          startPosition = getDiscardTopCardPosition(discardContainer, gameState.selectedCard.discardPileIndex);
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

      anim.startAnimation({
        card: animationCard,
        startPosition,
        endPosition,
        startAngleDeg,
        animationType,
        sourceRevealed:
          options.sourceRevealedOverride ??
          ((animationType === 'play' && gameState.selectedCard?.source !== 'hand') ||
            (animationType === 'discard' && false)), // Hand cards are revealed, stock/discard are not
        targetSettledInState: options.targetSettledInStateOverride ?? false,
        targetPileLength: options.targetPileLengthOverride,
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
