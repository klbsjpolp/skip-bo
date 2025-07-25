import { useCallback, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { gameMachine } from '@/state/gameMachine';
import { GameState, MoveResult } from '@/types';
import { canPlayCard } from '@/lib/validators';
import {AIDifficulty} from "@/ai/aiConfig.ts";

export function useSkipBoGame() {
  const [snapshot, send] = useMachine(gameMachine);
  const state = snapshot.context.G;
  const dispatch = send;                     // alias pour préserver la suite du code
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  /* wrappers compatibles avec l'UI existante */
  const initializeGame = useCallback(() => {
    dispatch({ type: 'INIT' });
  }, []);

  const selectCard = useCallback((source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
    dispatch({ type: 'SELECT_CARD', source, index, discardPileIndex });
  }, []);

  const playCard = useCallback((buildPile: number): Promise<MoveResult> => {
    return new Promise((resolve) => {
      const currentState = stateRef.current;
      
      // Validate before dispatching
      if (!currentState.selectedCard) {
        resolve({ success: false, message: 'Aucune carte sélectionnée' });
        return;
      }

      if (!canPlayCard(currentState.selectedCard.card, buildPile, currentState)) {
        resolve({ success: false, message: 'Vous ne pouvez pas jouer cette carte' });
        return;
      }

      dispatch({ type: 'PLAY_CARD', buildPile });
      resolve({ success: true, message: 'Carte jouée' });
    });
  }, []);

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

      dispatch({ type: 'DISCARD_CARD', discardPile });
      resolve({ success: true, message: 'Carte défaussée' });
    });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const canPlayCardWrapper = useCallback((card: any, buildPileIndex: number, gameState: GameState) => {
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