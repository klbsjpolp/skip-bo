import {produce} from 'immer';
import {GameState} from '@/types';
import {GameAction} from './gameActions';
import {initialGameState} from './initialGameState';
import {MESSAGES} from '@/lib/config';
import {canPlayCard} from '@/lib/validators';

export const gameReducer = produce((draft: GameState, action: GameAction) => {
  switch (action.type) {
    case 'INIT': {
      return initialGameState();
    }

    case 'DRAW': {
      const player = draft.players[draft.currentPlayerIndex];
      
      // Count empty slots in hand (null values)
      const emptySlots = player.hand.filter(card => card === null).length;

      let remainingToDraw = action.count ||
        Math.min(emptySlots, draft.deck.length + draft.completedBuildPiles.length);

      // If no empty slots and no count specified, return early
      if (remainingToDraw === 0) {
        return;
      }

      // First, draw from existing deck
      const fromDeck = Math.min(remainingToDraw, draft.deck.length);
      if (fromDeck > 0) {
        // Fill empty slots first
        for (let i = 0; i < player.hand.length && remainingToDraw > 0; i++) {
          if (player.hand[i] === null && draft.deck.length > 0) {
            player.hand[i] = draft.deck.shift()!;
            remainingToDraw--;
          }
        }
      } else {
        // Variable-length system: add cards to end
        while (remainingToDraw > 0 && draft.deck.length > 0) {
          player.hand.push(draft.deck.shift()!);
          remainingToDraw--;
        }
      }

      // If we still need more cards and have completed build piles, reshuffle and continue
      if (remainingToDraw > 0 && draft.completedBuildPiles.length > 0) {
        // Move completed build piles to deck and shuffle
        draft.deck.push(...draft.completedBuildPiles);
        draft.completedBuildPiles = [];

        // Shuffle deck
        for (let i = draft.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [draft.deck[i], draft.deck[j]] = [draft.deck[j], draft.deck[i]];
        }

        // Draw remaining cards to fill empty slots
        for (let i = 0; i < player.hand.length && remainingToDraw > 0 && draft.deck.length > 0; i++) {
          if (player.hand[i] === null) {
            player.hand[i] = draft.deck.shift()!;
            remainingToDraw--;
          }
        }
      }
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
      break;
    }

    case 'CLEAR_SELECTION':
      draft.selectedCard = null;
      draft.message = 'Sélectionnez une carte';
      break;

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

      // Draw cards only if the player's hand is empty (all slots are null)
      const allSlotsEmpty = player.hand.every(card => card === null);
      if (allSlotsEmpty) {
        // Count empty slots in hand (null values)
        const emptySlots = player.hand.filter(card => card === null).length;

        let remainingToDraw = Math.min(emptySlots, draft.deck.length + draft.completedBuildPiles.length);

        // First, draw from existing deck
        const fromDeck = Math.min(remainingToDraw, draft.deck.length);
        if (fromDeck > 0) {
          // Fill empty slots first
          for (let i = 0; i < player.hand.length && remainingToDraw > 0; i++) {
            if (player.hand[i] === null && draft.deck.length > 0) {
              player.hand[i] = draft.deck.shift()!;
              remainingToDraw--;
            }
          }
        }

        // If we still need more cards and have completed build piles, reshuffle and continue
        if (remainingToDraw > 0 && draft.completedBuildPiles.length > 0) {
          // Move completed build piles to deck and shuffle
          draft.deck.push(...draft.completedBuildPiles);
          draft.completedBuildPiles = [];

          // Shuffle deck
          for (let i = draft.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [draft.deck[i], draft.deck[j]] = [draft.deck[j], draft.deck[i]];
          }

          // Draw remaining cards to fill empty slots
          for (let i = 0; i < player.hand.length && remainingToDraw > 0 && draft.deck.length > 0; i++) {
            if (player.hand[i] === null) {
              player.hand[i] = draft.deck.shift()!;
              remainingToDraw--;
            }
          }
        }
      }

      // Check if build pile is complete (12 cards)
      if (draft.buildPiles[buildPileIndex].length === 12) {
        // Completed build pile: move cards to completed pile storage
        draft.completedBuildPiles.push(...draft.buildPiles[buildPileIndex]);
        draft.buildPiles[buildPileIndex] = [];
      }

      // Check win condition
      if (player.stockPile.length === 0) {
        draft.gameIsOver = true;
        draft.message = MESSAGES.GAME_WON.replace('{player}', player.isAI ? "l'IA" : 'le joueur');
      } else {
        draft.message = `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}`;
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

      // Remove card from hand (set to null instead of removing)
      player.hand[selectedCard.index] = null;

      // End turn after discarding
      draft.currentPlayerIndex = 1 - draft.currentPlayerIndex;

      // Set message
      const currentPlayer = draft.players[1 - draft.currentPlayerIndex]; // Previous player
      const nextPlayer = draft.players[draft.currentPlayerIndex]; // New current player
      draft.message = `${currentPlayer.isAI ? "Tour de l'IA terminé" : "Votre tour est terminé"}. ${nextPlayer.isAI ? "L'IA joue maintenant" : "C'est votre tour"}`;

      // Clear selection
      draft.selectedCard = null;
      break;
    }

    case 'END_TURN':
      draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
      draft.selectedCard = null;

      // Don't draw cards here - let the state machine handle drawing
      // This ensures both human and AI players get the same drawing experience
      // with proper animations
      break;

    case 'RESET':
      return initialGameState();
      
    case 'SET_DIFFICULTY':
      draft.aiDifficulty = action.difficulty;
      break;
  }
});
