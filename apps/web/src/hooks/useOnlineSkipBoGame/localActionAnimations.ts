import type { Card, GameState } from '@skipbo/game-core';

import type { CardAnimationData } from '@/contexts/CardAnimationContext';
import { triggerCompletedBuildPileAnimation } from '@/services/completedBuildPileAnimationService';
import { consumeDragCommitOverride } from '@/services/dragCommitOverride';
import {
  calculateAnimationDuration,
  getBuildPilePosition,
  getDiscardTopCardPosition,
  getHandCardAngle,
  getHandCardPosition,
  getNextDiscardCardPosition,
  getStockCardPosition,
} from '@/utils/cardPositions';

type StartAnimation = (animationData: Omit<CardAnimationData, 'id'>) => string;

/**
 * Builds and fires the play animation for the local player's selected card,
 * measuring its rendered start position from the DOM (honoring an in-flight drag
 * override) and the destination build pile. Also fires the completed-build-pile
 * animation when this play finishes the pile. Returns the play animation's
 * duration so the caller can sequence follow-up effects.
 *
 * Extracted verbatim from the online hook's `playCard`; behavior is unchanged.
 */
export function startPlayCardAnimation(
  currentState: GameState,
  buildPile: number,
  completedBuildPileCards: Card[] | null,
  startAnimation: StartAnimation,
): number {
  const selectedCard = currentState.selectedCard;
  if (!selectedCard) {
    return 0;
  }

  let playAnimationDuration = 0;
  const dragOverride = consumeDragCommitOverride();
  try {
    const playerAreaElement = document.querySelector<HTMLElement>('.player-area[data-player-index="0"]');
    const centerAreaElement = document.querySelector('.center-area') as HTMLElement;
    let startAngleDeg: number | undefined;

    if (playerAreaElement && centerAreaElement) {
      let startPosition;

      if (selectedCard.source === 'hand') {
        const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
        if (handContainer) {
          startPosition = getHandCardPosition(handContainer, selectedCard.index);
          startAngleDeg = getHandCardAngle(handContainer, selectedCard.index);
        }
      } else if (selectedCard.source === 'stock') {
        const stockContainer = playerAreaElement.querySelector('.stock-pile') as HTMLElement;
        if (stockContainer) {
          startPosition = getStockCardPosition(stockContainer);
        }
      } else if (selectedCard.source === 'discard') {
        const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
        if (discardContainer && selectedCard.discardPileIndex !== undefined) {
          startPosition = getDiscardTopCardPosition(discardContainer, selectedCard.discardPileIndex);
        }
      }

      if (dragOverride?.startPosition) {
        startPosition = dragOverride.startPosition;
        startAngleDeg = undefined;
      }

      const endPosition = getBuildPilePosition(centerAreaElement, buildPile);

      if (startPosition) {
        playAnimationDuration = calculateAnimationDuration(startPosition, endPosition) * 1.2;
        // When this play completes the pile, the committed state clears the
        // build pile (length 0). targetPileLength must reflect that committed
        // length so CenterArea masks the in-flight card with the pre-completion
        // backdrop instead of painting the final card on the pile early.
        const previousBuildPileLength = currentState.buildPiles[buildPile].length;
        const settledBuildPileLength = completedBuildPileCards ? 0 : previousBuildPileLength + 1;
        startAnimation({
          card: selectedCard.card,
          startPosition,
          endPosition,
          startAngleDeg,
          animationType: 'play',
          sourceRevealed: true,
          targetRevealed: true,
          initialDelay: 0,
          duration: playAnimationDuration,
          targetSettledInState: true,
          targetPileLength: settledBuildPileLength,
          sourceInfo: {
            playerIndex: currentState.currentPlayerIndex,
            source: selectedCard.source,
            index: selectedCard.index,
            discardPileIndex: selectedCard.discardPileIndex,
          },
          targetInfo: {
            playerIndex: currentState.currentPlayerIndex,
            source: 'build',
            index: buildPile,
          },
        });
      }
    }
  } catch (error) {
    console.warn('Play animation failed, continuing with online game logic:', error);
  }

  if (completedBuildPileCards) {
    triggerCompletedBuildPileAnimation(
      currentState,
      buildPile,
      completedBuildPileCards,
      currentState.completedBuildPiles.length,
      100,
      playAnimationDuration,
    );
  }

  return playAnimationDuration;
}

/**
 * Builds and fires the discard animation for the local player's selected hand
 * card, measuring its rendered start position from the DOM (honoring an in-flight
 * drag override) and the destination discard pile. Returns the animation's
 * duration so the caller can hold the next player's draw until it finishes.
 *
 * Extracted verbatim from the online hook's `discardCard`; behavior is unchanged.
 */
export function startDiscardCardAnimation(
  currentState: GameState,
  discardPile: number,
  startAnimation: StartAnimation,
): number {
  const selectedCard = currentState.selectedCard;
  if (!selectedCard) {
    return 0;
  }

  const dragOverride = consumeDragCommitOverride();
  let discardAnimationDuration = 0;

  try {
    const playerAreaElement = document.querySelector<HTMLElement>('.player-area[data-player-index="0"]');

    if (playerAreaElement) {
      const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
      if (handContainer) {
        const startPosition = dragOverride?.startPosition ?? getHandCardPosition(handContainer, selectedCard.index);
        const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
        if (discardContainer) {
          const endPosition = getNextDiscardCardPosition(discardContainer, discardPile);
          const animationDuration = calculateAnimationDuration(startPosition, endPosition);
          discardAnimationDuration = animationDuration;
          const previousDiscardPileLength =
            currentState.players[currentState.currentPlayerIndex].discardPiles[discardPile].length;
          startAnimation({
            card: selectedCard.card,
            startPosition,
            endPosition,
            animationType: 'discard',
            sourceRevealed: true,
            targetRevealed: true,
            initialDelay: 0,
            duration: animationDuration,
            startAngleDeg: dragOverride?.startPosition
              ? undefined
              : getHandCardAngle(handContainer, selectedCard.index),
            targetSettledInState: true,
            targetPileLength: previousDiscardPileLength + 1,
            sourceInfo: {
              playerIndex: currentState.currentPlayerIndex,
              source: selectedCard.source,
              index: selectedCard.index,
              discardPileIndex: selectedCard.discardPileIndex,
            },
            targetInfo: {
              playerIndex: currentState.currentPlayerIndex,
              source: 'discard',
              index: discardPile,
              discardPileIndex: discardPile,
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn('Discard animation failed, continuing with online game logic:', error);
  }

  return discardAnimationDuration;
}
