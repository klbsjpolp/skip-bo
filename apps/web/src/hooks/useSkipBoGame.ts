import React, {useCallback, useRef} from 'react';
import {useMachine} from '@xstate/react';
import {gameMachine} from '@/state/gameMachine';
import type {Card, GameState, MoveResult} from '@/types';
import {canPlayCard} from '@/lib/validators';
import {
  calculateAnimationDuration,
  getBuildPilePosition,
  getDiscardTopCardPosition,
  getHandCardAngle,
  getHandCardPosition,
  getNextDiscardCardPosition,
  getStockCardPosition,
} from '@/utils/cardPositions';
import {setGlobalAnimationContext} from '@/services/aiAnimationService';
import {
  calculateMultipleDrawAnimationDuration,
  setGlobalDrawAnimationContext,
  triggerMultipleDrawAnimations,
} from '@/services/drawAnimationService';
import {
  setGlobalCompletedPileAnimationContext,
  triggerCompletedBuildPileAnimation,
} from '@/services/completedBuildPileAnimationService';
import {useCardAnimation} from "@/contexts/useCardAnimation.ts";
import {getCompletedBuildPileCards} from '@/lib/retreatPile';
import {planHandRefill} from '@/lib/handRefill';

// Helper function to check if a PLAY_CARD action will result in an empty hand
const willPlayCardEmptyHand = (gameState: GameState): boolean => {
  if (!gameState.selectedCard || gameState.selectedCard.source !== 'hand') {
    return false;
  }
  
  const player = gameState.players[gameState.currentPlayerIndex];
  const handAfterPlay = [...player.hand];
  handAfterPlay[gameState.selectedCard.index] = null;
  
  return handAfterPlay.every(card => card === null);
};

export function useSkipBoGame() {
  const [snapshot, send] = useMachine(gameMachine);
  const state = snapshot.context.G;
  const dispatch = send;                     // alias pour préserver la suite du code
  const stateRef = useRef<GameState>(state);
  const interactionLockRef = useRef(false);
  const { startAnimation, removeAnimation, waitForAnimations } = useCardAnimation();

  React.useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Set up global animation context for AI animations and draw animations
  React.useEffect(() => {
    setGlobalAnimationContext({ startAnimation, waitForAnimations });
    setGlobalDrawAnimationContext({ startAnimation, removeAnimation });
    setGlobalCompletedPileAnimationContext({ startAnimation });
  }, [startAnimation, removeAnimation, waitForAnimations]);

  /* wrappers compatibles avec l'UI existante */
  const initializeGame = useCallback(() => {
    dispatch({ type: 'INIT' });
  }, [dispatch]);

  const debugFillBuildPile = useCallback((buildPile: number) => {
    dispatch({ type: 'DEBUG_FILL_BUILD_PILE', buildPile });
  }, [dispatch]);

  const debugWin = useCallback(() => {
    dispatch({ type: 'DEBUG_WIN' });
  }, [dispatch]);

  // Animations are decoupled from the interaction lock: the user can keep
  // selecting and playing cards while previous animations are still in flight.
  // The lock is held only for the synchronous body of playCard/discardCard so
  // two concurrent dispatches can't race on the same selectedCard.
  const isInteractionBlocked = useCallback(() => (
    interactionLockRef.current
  ), []);

  const selectCard = useCallback((source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
    if (isInteractionBlocked()) {
      return;
    }

    dispatch({ type: 'SELECT_CARD', source, index, discardPileIndex });
  }, [dispatch, isInteractionBlocked]);

  const playCard = useCallback(async (buildPile: number): Promise<MoveResult> => {
    const currentState = stateRef.current;
    const completedBuildPileCards = getCompletedBuildPileCards(currentState, buildPile);

    if (isInteractionBlocked()) {
      return { success: false, message: 'Action en cours' };
    }
    
    // Validate before dispatching
    if (!currentState.selectedCard) {
      return { success: false, message: 'Aucune carte sélectionnée' };
    }
    
    if (!canPlayCard(currentState.selectedCard.card, buildPile, currentState)) {
      return { success: false, message: 'Vous ne pouvez pas jouer cette carte' };
    }

    // Check if this play will empty the hand and trigger animations accordingly
    const willEmptyHand = willPlayCardEmptyHand(currentState);
    let refillCards: Card[] = [];
    let refillHandIndices: number[] = [];

    if (willEmptyHand && currentState.selectedCard?.source === 'hand') {
      const player = currentState.players[currentState.currentPlayerIndex];
      const handAfterPlay = [...player.hand];
      handAfterPlay[currentState.selectedCard.index] = null;

      const refillPlan = planHandRefill(
        handAfterPlay,
        currentState.deck,
        currentState.completedBuildPiles,
      );
      refillCards = refillPlan.cards;
      refillHandIndices = refillPlan.handIndices;
    }

    interactionLockRef.current = true;

    // Compute play animation, then chain completion & refill via baseDelay so
    // they queue up *without* awaiting. The dispatch happens immediately after,
    // so further user actions (select / play / discard) aren't blocked by the
    // visual animation. Cards in flight are masked at source/target via
    // `isCardBeingAnimated` in PlayerArea/CenterArea.
    let playAnimationDuration = 0;

    try {
      const playerAreaElement = document.querySelector<HTMLElement>(`.player-area[data-player-index="${currentState.currentPlayerIndex}"]`);
      const centerAreaElement = document.querySelector('.center-area') as HTMLElement;
      let startAngleDeg: number | undefined;

      if (playerAreaElement && centerAreaElement) {
        let startPosition;

        // Calculate start position based on source
        if (currentState.selectedCard.source === 'hand') {
          const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
          if (handContainer) {
            startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index);
            startAngleDeg = getHandCardAngle(handContainer, currentState.selectedCard.index);
          }
        } else if (currentState.selectedCard.source === 'stock') {
          const stockContainer = playerAreaElement.querySelector('.stock-pile') as HTMLElement;
          if (stockContainer) {
            startPosition = getStockCardPosition(stockContainer);
          }
        } else if (currentState.selectedCard.source === 'discard') {
          const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
          if (discardContainer && currentState.selectedCard.discardPileIndex !== undefined) {
            startPosition = getDiscardTopCardPosition(discardContainer, currentState.selectedCard.discardPileIndex);
          }
        }

        // Calculate end position (build pile)
        const endPosition = getBuildPilePosition(centerAreaElement, buildPile);

        if (startPosition) {
          const duration = calculateAnimationDuration(startPosition, endPosition);
          playAnimationDuration = duration * 1.2;
          // Mask the freshly-dispatched card at the build pile until the play
          // animation has actually landed. Without targetSettledInState the
          // top of the pile would render the new card immediately (because we
          // dispatched PLAY_CARD before the animation), making the card appear
          // teleported to its destination before flying there.
          const previousBuildPileLength = currentState.buildPiles[buildPile].length;
          startAnimation({
            card: currentState.selectedCard.card,
            startPosition,
            endPosition,
            startAngleDeg,
            animationType: 'play',
            sourceRevealed: true,
            targetRevealed: true,
            initialDelay: 0,
            duration: playAnimationDuration,
            targetSettledInState: true,
            targetPileLength: previousBuildPileLength + 1,
            sourceInfo: {
              playerIndex: currentState.currentPlayerIndex,
              source: currentState.selectedCard.source,
              index: currentState.selectedCard.index,
              discardPileIndex: currentState.selectedCard.discardPileIndex,
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
      console.warn('Play animation failed, continuing with game logic:', error);
    }

    // Schedule completion animation to start once the play animation has landed.
    let completionAnimationDuration = 0;

    if (completedBuildPileCards) {
      try {
        completionAnimationDuration = triggerCompletedBuildPileAnimation(
          currentState,
          buildPile,
          completedBuildPileCards,
          currentState.completedBuildPiles.length,
          100,
          playAnimationDuration,
        );
      } catch (error) {
        console.warn('Completed build pile animation failed, continuing with game logic:', error);
      }
    }

    // completionAnimationDuration already includes playAnimationDuration as its baseDelay,
    // so when there is a completion the refill must wait until all retreat cards have landed.
    // Without a completion, the refill just waits for the play animation itself.
    const refillBaseDelay = completedBuildPileCards
      ? completionAnimationDuration
      : playAnimationDuration;
    const drawAnimationDuration =
      refillHandIndices.length > 0
        ? calculateMultipleDrawAnimationDuration(
          currentState.currentPlayerIndex,
          refillHandIndices,
          500,
          refillBaseDelay,
        )
        : 0;

    // Dispatch immediately. The xstate machine transitions to
    // humanActionAnimating, but it now permits further human actions while the
    // animationGate waits on `waitForAnimations()` for every queued animation.
    dispatch({
      type: 'PLAY_CARD',
      buildPile,
      animationDuration: Math.max(completionAnimationDuration, drawAnimationDuration),
    });

    if (refillCards.length > 0) {
      void triggerMultipleDrawAnimations(
        currentState.currentPlayerIndex,
        refillCards,
        refillHandIndices,
        500,
        refillBaseDelay,
      ).catch((error) => {
        console.warn('Draw animation failed, continuing with game logic:', error);
      });
    }
    interactionLockRef.current = false;
    return { success: true, message: 'Carte jouée' };
  }, [dispatch, isInteractionBlocked, startAnimation]);

  const discardCard = useCallback(async (discardPile: number): Promise<MoveResult> => {
    const currentState = stateRef.current;

    if (isInteractionBlocked()) {
      return { success: false, message: 'Action en cours' };
    }

    if (!currentState.selectedCard) {
      return { success: false, message: 'Aucune carte sélectionnée' };
    }

    if (currentState.selectedCard.source !== 'hand') {
      return { success: false, message: 'Vous devez défausser une carte de votre main' };
    }

    if (currentState.selectedCard.card.isSkipBo) {
      return { success: false, message: 'Vous ne pouvez pas défausser une carte Skip-Bo' };
    }

    interactionLockRef.current = true;

    // Trigger discard animation, then dispatch immediately. The animation runs
    // in parallel; the discard ends the human turn (currentPlayerIndex flips),
    // so the xstate guard `isHumanAction` will reject any stray action — but
    // selections / plays issued *before* the discard ran can still complete
    // their visual animations because the animationGate keeps waiting on
    // `waitForAnimations()` until the queue is empty.
    let discardAnimationDuration = 0;
    try {
      const playerAreaElement = document.querySelector<HTMLElement>(`.player-area[data-player-index="${currentState.currentPlayerIndex}"]`);

      if (playerAreaElement) {
        const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
        if (handContainer) {
          const startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index);
          const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
          if (discardContainer) {
            const endPosition = getNextDiscardCardPosition(discardContainer, discardPile);
            discardAnimationDuration = calculateAnimationDuration(startPosition, endPosition);
            // Mask the freshly-dispatched card on the discard pile until the
            // animation lands — the dispatch happens immediately, so without
            // this the card would teleport to the pile and then re-animate.
            const previousDiscardPileLength = currentState.players[currentState.currentPlayerIndex].discardPiles[discardPile].length;
            startAnimation({
              card: currentState.selectedCard.card,
              startPosition,
              endPosition,
              animationType: 'discard',
              sourceRevealed: true,
              targetRevealed: true,
              initialDelay: 0,
              duration: discardAnimationDuration,
              startAngleDeg: getHandCardAngle(handContainer, currentState.selectedCard.index),
              targetSettledInState: true,
              targetPileLength: previousDiscardPileLength + 1,
              sourceInfo: {
                playerIndex: currentState.currentPlayerIndex,
                source: currentState.selectedCard.source,
                index: currentState.selectedCard.index,
                discardPileIndex: currentState.selectedCard.discardPileIndex,
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
      console.warn('Animation failed, continuing with game logic:', error);
    }

    dispatch({ type: 'DISCARD_CARD', discardPile, animationDuration: discardAnimationDuration });
    interactionLockRef.current = false;
    return { success: true, message: 'Carte défaussée' };
  }, [dispatch, isInteractionBlocked, startAnimation]);

  const clearSelection = useCallback(() => {
    if (isInteractionBlocked()) {
      return;
    }

    dispatch({ type: 'CLEAR_SELECTION' });
  }, [dispatch, isInteractionBlocked]);

  const canPlayCardWrapper = useCallback((card: Card, buildPileIndex: number, gameState: GameState) => {
    return canPlayCard(card, buildPileIndex, gameState);
  }, []);

  const getLatestGameState = useCallback(() => stateRef.current, []);

  return {
    gameState: state,
    initializeGame,
    debugFillBuildPile,
    debugWin,
    selectCard,
    playCard,
    discardCard,
    clearSelection,
    canPlayCard: canPlayCardWrapper,
    getLatestGameState,
  };
}
