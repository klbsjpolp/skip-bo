import React, {useCallback, useRef} from 'react';
import {useMachine} from '@xstate/react';
import {gameMachine} from '@/state/gameMachine';
import type {Card, GameState, MoveResult} from '@/types';
import {canPlayCard} from '@/lib/validators';
import {
  calculateAnimationDuration,
  getBuildPilePosition,
  getHandCardAngle,
  getHandCardPosition,
  getNextDiscardCardPosition,
  getStockCardPosition
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

  const selectCard = useCallback((source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
    dispatch({ type: 'SELECT_CARD', source, index, discardPileIndex });
  }, [dispatch]);

  const playCard = useCallback(async (buildPile: number): Promise<MoveResult> => {
    const currentState = stateRef.current;
    const completedBuildPileCards = getCompletedBuildPileCards(currentState, buildPile);
    
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
    
    // Trigger play animation first
    try {
      // Get the correct player area based on current player index
      // Note: DOM order is AI (index 0), Human (index 1), but playerIndex is Human=0, AI=1
      const playerAreas = document.querySelectorAll('.player-area');
      const domIndex = currentState.currentPlayerIndex === 0 ? 1 : 0; // Human=1, AI=0 in DOM
      const playerAreaElement = playerAreas[domIndex] as HTMLElement;
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
            startPosition = getNextDiscardCardPosition(discardContainer, currentState.selectedCard.discardPileIndex);
          }
        }
        
        // Calculate end position (build pile)
        const endPosition = getBuildPilePosition(centerAreaElement, buildPile);
        
        if (startPosition) {
          const duration = calculateAnimationDuration(startPosition, endPosition);
          startAnimation({
            card: currentState.selectedCard.card,
            startPosition,
            endPosition,
            startAngleDeg,
            animationType: 'play',
            sourceRevealed: true,
            targetRevealed: true,
            initialDelay: 0,
            duration:duration*1.2,
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
          
          await waitForAnimations();
        }
      }
    } catch (error) {
      console.warn('Play animation failed, continuing with game logic:', error);
    }

    let completionAnimationDuration = 0;

    if (completedBuildPileCards) {
      try {
        completionAnimationDuration = triggerCompletedBuildPileAnimation(
          currentState,
          buildPile,
          completedBuildPileCards,
          currentState.completedBuildPiles.length,
        );
      } catch (error) {
        console.warn('Completed build pile animation failed, continuing with game logic:', error);
      }
    }

    const drawAnimationDuration =
      refillHandIndices.length > 0
        ? calculateMultipleDrawAnimationDuration(
          currentState.currentPlayerIndex,
          refillHandIndices,
          500,
          completionAnimationDuration,
        )
        : 0;

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
        completionAnimationDuration,
      ).catch((error) => {
        console.warn('Draw animation failed, continuing with game logic:', error);
      });
    }
    return { success: true, message: 'Carte jouée' };
  }, [dispatch, startAnimation, waitForAnimations]);

  const discardCard = useCallback((discardPile: number): Promise<MoveResult> => {
    return new Promise((resolve) => {
      const currentState = stateRef.current;
      
      // Validate before dispatching
      if (!currentState.selectedCard) {
        resolve({ success: false, message: 'Aucune carte sélectionnée' });
        return;
      }

      if (currentState.selectedCard.source !== 'hand') {
        resolve({ success: false, message: 'Vous devez défausser une carte de votre main' });
        return;
      }

      if (currentState.selectedCard.card.isSkipBo) {
        resolve({ success: false, message: 'Vous ne pouvez pas défausser une carte Skip-Bo' });
        return;
      }

      let animationDuration = 0;

      // Trigger animation before state change
      try {
        // Get the correct player area based on current player index
        // Note: DOM order is AI (index 0), Human (index 1), but playerIndex is Human=0, AI=1
        const playerAreas = document.querySelectorAll('.player-area');
        const domIndex = currentState.currentPlayerIndex === 0 ? 1 : 0; // Human=1, AI=0 in DOM
        const playerAreaElement = playerAreas[domIndex] as HTMLElement;
        
        if (playerAreaElement) {
          // Calculate start position (hand card)
          const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
          if (handContainer) {
            const startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index);
            
            // Calculate end position (discard pile)
            const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
            if (discardContainer) {
              const endPosition = getNextDiscardCardPosition(discardContainer, discardPile);
              
              const duration = calculateAnimationDuration(startPosition, endPosition);
              animationDuration = duration;
              startAnimation({
                card: currentState.selectedCard.card,
                startPosition,
                endPosition,
                animationType: 'discard',
                sourceRevealed: true,
                targetRevealed: true,
                initialDelay: 0,
                duration,
                startAngleDeg: getHandCardAngle(handContainer, currentState.selectedCard.index),
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

      // Wait for animation to complete before dispatching state change
      setTimeout(() => {
        dispatch({ type: 'DISCARD_CARD', discardPile });
        resolve({ success: true, message: 'Carte défaussée' });
      }, animationDuration);
    });
  }, [dispatch, startAnimation]);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, [dispatch]);

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
