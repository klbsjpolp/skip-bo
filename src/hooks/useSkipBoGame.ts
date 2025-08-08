import React, { useCallback, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { gameMachine } from '@/state/gameMachine';
import { GameState, MoveResult, Card } from '@/types';
import { canPlayCard } from '@/lib/validators';
import {AIDifficulty} from "@/ai/aiConfig.ts";
import { useCardAnimation } from '@/contexts/CardAnimationContext';
import { 
  getHandCardPosition, 
  getStockCardPosition, 
  getDiscardCardPosition, 
  getBuildPilePosition,
  calculateAnimationDuration 
} from '@/utils/cardPositions';
import { setGlobalAnimationContext } from '@/services/aiAnimationService';
import { setGlobalDrawAnimationContext, triggerMultipleDrawAnimations } from '@/services/drawAnimationService';

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
  stateRef.current = state;
  const { startAnimation, removeAnimation } = useCardAnimation();

  // Set up global animation context for AI animations and draw animations
  React.useEffect(() => {
    setGlobalAnimationContext({ startAnimation });
    setGlobalDrawAnimationContext({ startAnimation, removeAnimation });
  }, [startAnimation, removeAnimation]);

  /* wrappers compatibles avec l'UI existante */
  const initializeGame = useCallback(() => {
    dispatch({ type: 'INIT' });
  }, [dispatch]);

  const selectCard = useCallback((source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
    dispatch({ type: 'SELECT_CARD', source, index, discardPileIndex });
  }, [dispatch]);

  const playCard = useCallback(async (buildPile: number): Promise<MoveResult> => {
    const currentState = stateRef.current;
    
    // Validate before dispatching
    if (!currentState.selectedCard) {
      return { success: false, message: 'Aucune carte sélectionnée' };
    }

    if (!canPlayCard(currentState.selectedCard.card, buildPile, currentState)) {
      return { success: false, message: 'Vous ne pouvez pas jouer cette carte' };
    }

    // Check if this play will empty the hand and trigger animations accordingly
    const willEmptyHand = willPlayCardEmptyHand(currentState);
    
    // Trigger play animation first
    try {
      // Get the correct player area based on current player index
      // Note: DOM order is AI (index 0), Human (index 1), but playerIndex is Human=0, AI=1
      const playerAreas = document.querySelectorAll('.player-area');
      const domIndex = currentState.currentPlayerIndex === 0 ? 1 : 0; // Human=1, AI=0 in DOM
      const playerAreaElement = playerAreas[domIndex] as HTMLElement;
      const centerAreaElement = document.querySelector('.center-area') as HTMLElement;
      
      if (playerAreaElement && centerAreaElement) {
        let startPosition;
        
        // Calculate start position based on source
        if (currentState.selectedCard.source === 'hand') {
          const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
          if (handContainer) {
            const isOverlapping = currentState.players[currentState.currentPlayerIndex].hand.length > 4;
            startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index, isOverlapping);
          }
        } else if (currentState.selectedCard.source === 'stock') {
          const stockContainer = playerAreaElement.querySelector('.w-20') as HTMLElement;
          if (stockContainer) {
            startPosition = getStockCardPosition(stockContainer);
          }
        } else if (currentState.selectedCard.source === 'discard') {
          const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
          if (discardContainer && currentState.selectedCard.discardPileIndex !== undefined) {
            startPosition = getDiscardCardPosition(discardContainer, currentState.selectedCard.discardPileIndex);
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
            animationType: 'play',
            initialDelay: 0,
            duration,
            sourceInfo: {
              playerIndex: currentState.currentPlayerIndex,
              source: currentState.selectedCard.source,
              index: currentState.selectedCard.index,
              discardPileIndex: currentState.selectedCard.discardPileIndex,
            },
          });
          
          // Wait for play animation to complete
          await new Promise(resolve => setTimeout(resolve, duration));
        }
      }
    } catch (error) {
      console.warn('Play animation failed, continuing with game logic:', error);
    }

    // If hand will be emptied, trigger draw animations before dispatching
    if (willEmptyHand) {
      try {
        const player = currentState.players[currentState.currentPlayerIndex];
        const handCopy = [...player.hand];
        handCopy[currentState.selectedCard.index] = null;
        
        // Calculate cards that will be drawn (same logic as in gameReducer)
        const emptySlots = handCopy.filter(card => card === null).length;
        const cardsToDraw = Math.min(emptySlots, currentState.deck.length + currentState.completedBuildPiles.length);
        
        if (cardsToDraw > 0) {
          const cardsToAnimate: Card[] = [];
          const handIndices: number[] = [];
          
          // Simulate the draw to get the cards that will be drawn
          let remainingToDraw = cardsToDraw;
          const deckCopy = [...currentState.deck];
          const completedBuildPilesCopy = [...currentState.completedBuildPiles];
          
          // First, get cards from existing deck
          for (let i = 0; i < handCopy.length && remainingToDraw > 0; i++) {
            if (handCopy[i] === null && deckCopy.length > 0) {
              cardsToAnimate.push(deckCopy.shift()!);
              handIndices.push(i);
              remainingToDraw--;
            }
          }
          
          // If we need more cards and have completed build piles, reshuffle
          if (remainingToDraw > 0 && completedBuildPilesCopy.length > 0) {
            deckCopy.push(...completedBuildPilesCopy);
            
            // Shuffle deck
            for (let i = deckCopy.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
            }
            
            // Get remaining cards
            for (let i = 0; i < handCopy.length && remainingToDraw > 0; i++) {
              if (handCopy[i] === null && deckCopy.length > 0) {
                cardsToAnimate.push(deckCopy.shift()!);
                handIndices.push(i);
                remainingToDraw--;
              }
            }
          }
          
          // Trigger draw animations
          if (cardsToAnimate.length > 0) {
            console.log(`🔄 useSkipBoGame: Starting draw animations for ${cardsToAnimate.length} cards`);
            const startTime = Date.now();

            const drawAnimationDuration = await triggerMultipleDrawAnimations(
              currentState,
              currentState.currentPlayerIndex,
              cardsToAnimate,
              handIndices,
              150 // 150ms stagger between cards
            );
            
            console.log(`⏱️ useSkipBoGame: Received drawAnimationDuration: ${drawAnimationDuration}ms after ${Date.now() - startTime}ms`);

            // Wait for draw animations to complete
            if (drawAnimationDuration > 0) {
              console.log(`⏳ useSkipBoGame: Waiting additional ${drawAnimationDuration}ms before proceeding with game logic`);
              await new Promise(resolve => setTimeout(resolve, drawAnimationDuration));
              console.log(`✅ useSkipBoGame: Wait complete, proceeding with game logic at ${Date.now()}`);
            }
          }
        }
      } catch (error) {
        console.warn('Draw animation failed, continuing with game logic:', error);
      }
    }

    dispatch({ type: 'PLAY_CARD', buildPile });
    return { success: true, message: 'Carte jouée' };
  }, [dispatch, startAnimation]);

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
            const isOverlapping = currentState.players[currentState.currentPlayerIndex].hand.length > 4;
            const startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index, isOverlapping);
            
            // Calculate end position (discard pile)
            const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
            if (discardContainer) {
              const endPosition = getDiscardCardPosition(discardContainer, discardPile);
              
              const duration = calculateAnimationDuration(startPosition, endPosition);
              animationDuration = duration;
              startAnimation({
                card: currentState.selectedCard.card,
                startPosition,
                endPosition,
                animationType: 'discard',
                initialDelay: 0,
                duration,
                sourceInfo: {
                  playerIndex: currentState.currentPlayerIndex,
                  source: currentState.selectedCard.source,
                  index: currentState.selectedCard.index,
                  discardPileIndex: currentState.selectedCard.discardPileIndex,
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
    selectCard,
    playCard,
    discardCard,
    clearSelection,
    canPlayCard: canPlayCardWrapper,
    getLatestGameState,
    setDifficulty: (difficulty: AIDifficulty) => dispatch({ type: 'SET_DIFFICULTY', difficulty }),
  };
}