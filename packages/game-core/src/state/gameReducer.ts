import { produce } from 'immer';
import type { Card, GameState } from '../types/index.js';
import type { GameAction } from './gameActions.js';
import { initialGameState } from './initialGameState.js';
import { MESSAGES } from '../lib/config.js';
import { refillHand } from '../lib/handRefill.js';
import { canPlayCard, hasValidDiscardPileIndex, hasValidSelectedSource } from '../lib/validators.js';

const getNextPlayerIndex = (currentPlayerIndex: number, playerCount: number): number => {
  if (playerCount <= 0) {
    return 0;
  }

  return (currentPlayerIndex + 1) % playerCount;
};

export const gameReducer = produce((draft: GameState, action: GameAction) => {
  switch (action.type) {
    case 'INIT': {
      return initialGameState();
    }

    case 'DRAW': {
      const player = draft.players[draft.currentPlayerIndex];
      refillHand(draft, player, action.count);
      break;
    }

    case 'DRAW_SINGLE_CARD': {
      const player = draft.players[draft.currentPlayerIndex];

      // Place the specific card in the specific hand slot
      if (action.handIndex >= 0 && action.handIndex < player.hand.length) {
        player.hand[action.handIndex] = action.card;
      }

      return;
    }

    case 'DEBUG_SET_AI_HAND': {
      const player = draft.players[draft.currentPlayerIndex];
      const targetSize = draft.config.HAND_SIZE;
      const newHand: (Card | null)[] = action.hand.slice(0, targetSize);
      while (newHand.length < targetSize) {
        newHand.push(null);
      }
      player.hand = newHand;
      // Clear selection to avoid stale indices
      draft.selectedCard = null;
      draft.message = 'Main IA forcée (debug)';
      return;
    }

    case 'DEBUG_FILL_BUILD_PILE': {
      if (action.buildPile < 0 || action.buildPile >= draft.buildPiles.length) {
        draft.message = MESSAGES.INVALID_MOVE;
        return;
      }

      draft.buildPiles[action.buildPile] = Array.from({ length: draft.config.CARD_VALUES_MAX - 1 }, (_, index) => ({
        value: index + 1,
        isSkipBo: false,
      }));

      const humanPlayer = draft.players[0];
      if (humanPlayer.hand.length > 0) {
        humanPlayer.hand[0] = {
          value: draft.config.CARD_VALUES_MAX,
          isSkipBo: false,
        };
      }

      draft.selectedCard = null;
      draft.message = 'Pile de construction prête (debug)';
      return;
    }

    case 'DEBUG_FILL_HAND_SKIPBO': {
      const player = draft.players[draft.currentPlayerIndex];
      player.hand = Array.from({ length: draft.config.HAND_SIZE }, () => ({
        value: 0,
        isSkipBo: true,
      }));
      draft.selectedCard = null;
      draft.message = 'Main remplie de Skip-Bo (debug)';
      return;
    }

    case 'DEBUG_CLEAR_STOCK_PILE': {
      const player = draft.players[0];
      player.stockPile = [{ value: 0, isSkipBo: true }];
      draft.selectedCard = null;
      draft.message = 'Pile de réserve vidée (debug)';
      return;
    }

    case 'DEBUG_CLEAR_AI_STOCK_PILE': {
      const aiIndex = draft.players.findIndex((p) => p.isAI);
      if (aiIndex === -1) {
        draft.message = MESSAGES.INVALID_MOVE;
        return;
      }

      draft.players[aiIndex].stockPile = [{ value: 0, isSkipBo: true }];
      // Hand the turn to the AI so it plays its last stock card and wins.
      draft.currentPlayerIndex = aiIndex;
      draft.selectedCard = null;
      draft.message = 'Pile de réserve IA vidée (debug)';
      return;
    }

    case 'DEBUG_WIN': {
      const winnerIndex = draft.currentPlayerIndex;
      const winner = draft.players[winnerIndex];
      winner.stockPile = [];
      draft.selectedCard = null;
      draft.gameIsOver = true;
      draft.winnerIndex = winnerIndex;
      draft.message = MESSAGES.GAME_WON.replace('{player}', winner.isAI ? "l'IA" : 'le joueur');
      return;
    }

    case 'SELECT_CARD': {
      const player = draft.players[draft.currentPlayerIndex];
      let card;

      // Get the card from the specified source
      if (action.source === 'hand') {
        card = player.hand[action.index];
      } else if (action.source === 'stock') {
        card = player.stockPile[player.stockPile.length - 1];
      } else if (action.source === 'discard' && action.discardPileIndex !== undefined) {
        const discardPile = player.discardPiles[action.discardPileIndex];
        card = discardPile[discardPile.length - 1];
      }

      if (card) {
        draft.selectedCard = {
          card,
          source: action.source,
          index: action.index,
          discardPileIndex: action.discardPileIndex,
          plannedBuildPileIndex: action.plannedBuildPileIndex,
          plannedDiscardPileIndex: action.plannedDiscardPileIndex,
        };
        const player = draft.players[draft.currentPlayerIndex];
        draft.message = player.isAI ? "L'IA joue" : 'Sélectionnez une destination';
      }
      break;
    }

    case 'CLEAR_SELECTION': {
      draft.selectedCard = null;
      const player = draft.players[draft.currentPlayerIndex];
      draft.message = player.isAI ? "L'IA joue" : 'Sélectionnez une carte';
      break;
    }

    case 'PLAY_CARD': {
      const { selectedCard } = draft;

      // Validation
      if (!selectedCard) {
        draft.message = MESSAGES.INVALID_MOVE_NO_SELECTION;
        return;
      }

      if (!canPlayCard(selectedCard.card, action.buildPile, draft)) {
        draft.message = MESSAGES.INVALID_MOVE_CANNOT_PLAY;
        return;
      }

      const player = draft.players[draft.currentPlayerIndex];

      if (!hasValidSelectedSource(player, selectedCard)) {
        draft.message = MESSAGES.INVALID_MOVE;
        draft.selectedCard = null;
        return;
      }

      const buildPileIndex = action.buildPile;

      // Add card to build pile - preserve Skip-Bo identity
      draft.buildPiles[buildPileIndex].push({ ...selectedCard.card });

      // Remove card from source
      if (selectedCard.source === 'hand') {
        player.hand[selectedCard.index] = null; // Set to null instead of removing
      } else if (selectedCard.source === 'stock') {
        player.stockPile.pop();
      } else if (selectedCard.source === 'discard' && selectedCard.discardPileIndex !== undefined) {
        player.discardPiles[selectedCard.discardPileIndex].pop();
      }

      // Check if build pile is complete, before refilling the hand so a
      // pile completed by this very play is available to reshuffle from.
      if (draft.buildPiles[buildPileIndex].length === draft.config.CARD_VALUES_MAX) {
        // Completed build pile: move cards to completed pile storage
        draft.completedBuildPiles.push(...draft.buildPiles[buildPileIndex]);
        draft.buildPiles[buildPileIndex] = [];
      }

      // Draw cards only if the player's hand is empty (all slots are null)
      const allSlotsEmpty = player.hand.every((card) => card === null);
      if (allSlotsEmpty) {
        refillHand(draft, player);
      }

      // Check win condition
      if (player.stockPile.length === 0) {
        draft.gameIsOver = true;
        draft.winnerIndex = draft.currentPlayerIndex;
        draft.message = MESSAGES.GAME_WON.replace('{player}', player.isAI ? "l'IA" : 'le joueur');
      } else {
        draft.message = `${player.isAI ? "L'IA joue" : 'Vous avez joué une carte'}`;
      }

      // Clear selection
      draft.selectedCard = null;
      break;
    }

    case 'DISCARD_CARD': {
      const { selectedCard } = draft;

      // Validation
      if (!selectedCard) {
        draft.message = MESSAGES.INVALID_MOVE_NO_SELECTION;
        return;
      }

      if (selectedCard.source !== 'hand') {
        draft.message = MESSAGES.INVALID_MOVE_MUST_DISCARD_FROM_HAND;
        return;
      }

      if (selectedCard.card.value === undefined) {
        draft.message = 'Error: Invalid card value';
        return;
      }

      const player = draft.players[draft.currentPlayerIndex];
      const discardPileIndex = action.discardPile;

      if (!hasValidSelectedSource(player, selectedCard) || !hasValidDiscardPileIndex(player, discardPileIndex)) {
        draft.message = MESSAGES.INVALID_MOVE;
        draft.selectedCard = null;
        return;
      }

      // Add card to discard pile
      player.discardPiles[discardPileIndex].push({
        value: selectedCard.card.value,
        isSkipBo: selectedCard.card.isSkipBo,
      });

      // Remove card from hand (set to null instead of removing)
      player.hand[selectedCard.index] = null;

      const previousPlayerIndex = draft.currentPlayerIndex;

      // End turn after discarding
      draft.currentPlayerIndex = getNextPlayerIndex(draft.currentPlayerIndex, draft.players.length);

      // Set message
      const currentPlayer = draft.players[previousPlayerIndex];
      const nextPlayer = draft.players[draft.currentPlayerIndex]; // New current player
      draft.message = `${currentPlayer.isAI ? "Tour de l'IA terminé" : 'Votre tour est terminé'}. ${nextPlayer.isAI ? "L'IA joue" : "C'est votre tour"}`;

      // Clear selection
      draft.selectedCard = null;
      break;
    }

    case 'END_TURN':
      draft.currentPlayerIndex = getNextPlayerIndex(draft.currentPlayerIndex, draft.players.length);
      draft.selectedCard = null;

      // Don't draw cards here - let the state machine handle drawing
      // This ensures both human and AI players get the same drawing experience
      // with proper animations
      break;

    case 'RESET':
      return initialGameState();
  }
});
