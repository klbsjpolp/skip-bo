import { produce } from 'immer';
import { GameState } from '@/types';
import { GameAction } from './gameActions';
import { initialGameState } from './initialGameState';
import { CONFIG, MESSAGES } from '@/lib/config';
import { canPlayCard } from '@/lib/validators';

export const gameReducer = produce( (draft: GameState, action: GameAction): GameState | void => {
  switch (action.type) {
    case 'INIT': {
      return initialGameState();                          // recrée totalement
    }

    case 'DRAW': {
      const player = draft.players[draft.currentPlayerIndex];
      const count = action.count ||
        Math.min(CONFIG.HAND_SIZE - player.hand.length, draft.deck.length);
      console.log('DRAW', count, player.hand.length, draft.deck.length);
      if (count > 0)
        player.hand.push(...draft.deck.splice(0, count));
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
          discardPileIndex: action.discardPileIndex
        };
        draft.message = 'Sélectionnez une destination';
      }
      return;
    }

    case 'CLEAR_SELECTION':
      draft.selectedCard = null;
      draft.message = 'Sélectionnez une carte';
      return;

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
      const buildPileIndex = action.buildPile;

      // Calculate next value for Skip-Bo cards
      const nextValue = draft.buildPiles[buildPileIndex].length === 0 
        ? 1 
        : draft.buildPiles[buildPileIndex][draft.buildPiles[buildPileIndex].length - 1].value + 1;
      
      // Create card to play (handle Skip-Bo)
      const cardToPlay = selectedCard.card.isSkipBo
        ? { isSkipBo: false, value: nextValue }
        : { ...selectedCard.card };

      // Add card to build pile
      draft.buildPiles[buildPileIndex].push(cardToPlay);

      // Remove card from source
      if (selectedCard.source === 'hand') {
        player.hand.splice(selectedCard.index, 1);
      } else if (selectedCard.source === 'stock') {
        player.stockPile.pop();
      } else if (selectedCard.source === 'discard' && selectedCard.discardPileIndex !== undefined) {
        player.discardPiles[selectedCard.discardPileIndex].pop();
      }
      
      // Draw cards only if the player's hand is empty (cleared without discarding)
      if (player.hand.length === 0 && draft.deck.length > 0) {
        const cardsToDraw = Math.min(CONFIG.HAND_SIZE, draft.deck.length);
        for (let i = 0; i < cardsToDraw; i++) {
          const drawnCard = draft.deck.pop()!;
          if (drawnCard.value !== undefined) {
            player.hand.push({
              value: drawnCard.value,
              isSkipBo: drawnCard.isSkipBo
            });
          }
        }
      }

      // Check if build pile is complete (12 cards)
      if (draft.buildPiles[buildPileIndex].length === 12) {
        draft.buildPiles[buildPileIndex] = [];
      }

      // Check win condition
      if (player.stockPile.length === 0) {
        draft.gameIsOver = true;
        draft.message = `${player.isAI ? 'IA' : 'Joueur'} ${MESSAGES.GAME_WON}`;
      } else {
        draft.message = `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}`;
      }

      // Clear selection
      draft.selectedCard = null;
      return;
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

      if (selectedCard.card.isSkipBo) {
        draft.message = MESSAGES.INVALID_MOVE_CANNOT_DISCARD_SKIP_BO;
        return;
      }

      if (selectedCard.card.value === undefined) {
        draft.message = 'Error: Invalid card value';
        return;
      }

      const player = draft.players[draft.currentPlayerIndex];
      const discardPileIndex = action.discardPile;

      // Add card to discard pile
      player.discardPiles[discardPileIndex].push({
        value: selectedCard.card.value,
        isSkipBo: selectedCard.card.isSkipBo
      });

      // Remove card from hand
      player.hand.splice(selectedCard.index, 1);

      // End turn after discarding
      draft.currentPlayerIndex = 1 - draft.currentPlayerIndex;

      // No card drawing here - cards should only be drawn at the beginning of a turn (END_TURN case)
      // or when a player clears their hand without discarding (PLAY_CARD case)

      // Set message
      const currentPlayer = draft.players[1 - draft.currentPlayerIndex]; // Previous player
      const nextPlayer = draft.players[draft.currentPlayerIndex]; // New current player
      draft.message = `${currentPlayer.isAI ? "Tour de l'IA terminé" : "Votre tour est terminé"}. ${nextPlayer.isAI ? "L'IA joue maintenant" : "C'est votre tour"}`;

      // Clear selection
      draft.selectedCard = null;
      return;
    }

    case 'END_TURN':
      draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
      draft.selectedCard = null;
      
      // Draw cards for the next player up to the maximum hand size
      const nextPlayer = draft.players[draft.currentPlayerIndex];
      if (nextPlayer.hand.length < CONFIG.HAND_SIZE && draft.deck.length > 0) {
        const cardsToDraw = Math.min(CONFIG.HAND_SIZE - nextPlayer.hand.length, draft.deck.length);
        for (let i = 0; i < cardsToDraw; i++) {
          const drawnCard = draft.deck.pop()!;
          if (drawnCard.value !== undefined) {
            nextPlayer.hand.push({
              value: drawnCard.value,
              isSkipBo: drawnCard.isSkipBo
            });
          }
        }
      }
      
      return;

    case 'RESET':
      return initialGameState();
  }
});