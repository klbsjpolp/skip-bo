import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer } from '@/state/gameReducer';
import { initialGameState } from '@/state/initialGameState';
import { GameState } from '@/types';

describe('gameReducer', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = initialGameState();
  });

  describe('INIT action', () => {
    it('should return a fresh initial state', () => {
      const result = gameReducer(initialState, { type: 'INIT' });
      expect(result).toBeDefined();
      expect(result.players).toHaveLength(2);
      expect(result.players[0].isAI).toBe(false);
      expect(result.players[1].isAI).toBe(true);
      expect(result.currentPlayerIndex).toBe(0);
      expect(result.gameIsOver).toBe(false);
    });
  });

  describe('DRAW action', () => {
    it('should draw default number of cards (5) from deck to current player hand', () => {
      const deckSizeBefore = initialState.deck.length;
      const handSizeBefore = initialState.players[0].hand.length;
      
      const result = gameReducer(initialState, { type: 'DRAW' });
      
      expect(result.players[0].hand).toHaveLength(handSizeBefore + 5);
      expect(result.deck).toHaveLength(deckSizeBefore - 5);
    });

    it('should draw specified number of cards', () => {
      const deckSizeBefore = initialState.deck.length;
      const handSizeBefore = initialState.players[0].hand.length;
      
      const result = gameReducer(initialState, { type: 'DRAW', count: 3 });
      
      expect(result.players[0].hand).toHaveLength(handSizeBefore + 3);
      expect(result.deck).toHaveLength(deckSizeBefore - 3);
    });
  });

  describe('SELECT_CARD action', () => {
    it('should select a card from hand', () => {
      const result = gameReducer(initialState, { 
        type: 'SELECT_CARD', 
        source: 'hand', 
        index: 0 
      });
      
      expect(result.selectedCard).toBeDefined();
      expect(result.selectedCard?.source).toBe('hand');
      expect(result.selectedCard?.index).toBe(0);
      expect(result.selectedCard?.card).toEqual(initialState.players[0].hand[0]);
    });

    it('should select a card from stock pile', () => {
      // Ensure stock pile has cards
      const stateWithStock = {
        ...initialState,
        players: [
          {
            ...initialState.players[0],
            stockPile: [{ value: 1, isSkipBo: false }]
          },
          initialState.players[1]
        ]
      };

      const result = gameReducer(stateWithStock, { 
        type: 'SELECT_CARD', 
        source: 'stock', 
        index: 0 
      });
      
      expect(result.selectedCard).toBeDefined();
      expect(result.selectedCard?.source).toBe('stock');
      expect(result.selectedCard?.card.value).toBe(1);
    });
  });

  describe('CLEAR_SELECTION action', () => {
    it('should clear the selected card', () => {
      // First select a card
      const stateWithSelection = gameReducer(initialState, { 
        type: 'SELECT_CARD', 
        source: 'hand', 
        index: 0 
      });
      
      expect(stateWithSelection.selectedCard).toBeDefined();
      
      // Then clear selection
      const result = gameReducer(stateWithSelection, { type: 'CLEAR_SELECTION' });
      
      expect(result.selectedCard).toBeNull();
    });
  });

  describe('PLAY_CARD action', () => {
    it('should not play card if no card is selected', () => {
      const result = gameReducer(initialState, { type: 'PLAY_CARD', buildPile: 0 });
      
      expect(result.message).toContain('Aucune carte sélectionnée');
    });

    it('should play a valid card to build pile', () => {
      // Create a state with a card 1 selected
      const stateWithCard1 = {
        ...initialState,
        players: [
          {
            ...initialState.players[0],
            hand: [{ value: 1, isSkipBo: false }]
          },
          initialState.players[1]
        ]
      };

      // Select the card
      const stateWithSelection = gameReducer(stateWithCard1, { 
        type: 'SELECT_CARD', 
        source: 'hand', 
        index: 0 
      });

      // Play the card
      const result = gameReducer(stateWithSelection, { type: 'PLAY_CARD', buildPile: 0 });
      
      expect(result.buildPiles[0]).toHaveLength(1);
      expect(result.buildPiles[0][0].value).toBe(1);
      // After playing the only card in hand, auto-draw should occur (5 new cards)
      expect(result.players[0].hand).toHaveLength(5);
      expect(result.selectedCard).toBeNull();
    });
  });

  describe('DISCARD_CARD action', () => {
    it('should not discard if no card is selected', () => {
      const result = gameReducer(initialState, { type: 'DISCARD_CARD', discardPile: 0 });
      
      expect(result.message).toContain('Aucune carte sélectionnée');
    });

    it('should not discard Skip-Bo cards', () => {
      // Create state with Skip-Bo card selected
      const stateWithSkipBo = {
        ...initialState,
        selectedCard: {
          card: { value: 0, isSkipBo: true },
          source: 'hand' as const,
          index: 0
        }
      };

      const result = gameReducer(stateWithSkipBo, { type: 'DISCARD_CARD', discardPile: 0 });
      
      expect(result.message).toContain('Skip-Bo');
    });

    it('should discard a valid card and end turn', () => {
      // Create state with regular card selected
      const stateWithCard = {
        ...initialState,
        players: [
          {
            ...initialState.players[0],
            hand: [{ value: 5, isSkipBo: false }]
          },
          initialState.players[1]
        ]
      };

      // Select the card
      const stateWithSelection = gameReducer(stateWithCard, { 
        type: 'SELECT_CARD', 
        source: 'hand', 
        index: 0 
      });

      // Discard the card
      const result = gameReducer(stateWithSelection, { type: 'DISCARD_CARD', discardPile: 0 });
      
      expect(result.players[0].discardPiles[0]).toHaveLength(1);
      expect(result.players[0].discardPiles[0][0].value).toBe(5);
      expect(result.players[0].hand).toHaveLength(0);
      expect(result.currentPlayerIndex).toBe(1); // Turn should switch
      expect(result.selectedCard).toBeNull();
    });
  });

  describe('END_TURN action', () => {
    it('should switch current player', () => {
      expect(initialState.currentPlayerIndex).toBe(0);
      
      const result = gameReducer(initialState, { type: 'END_TURN' });
      
      expect(result.currentPlayerIndex).toBe(1);
      expect(result.selectedCard).toBeNull();
    });

    it('should switch back to player 0 from player 1', () => {
      const stateWithPlayer1 = { ...initialState, currentPlayerIndex: 1 };
      
      const result = gameReducer(stateWithPlayer1, { type: 'END_TURN' });
      
      expect(result.currentPlayerIndex).toBe(0);
    });
  });

  describe('RESET action', () => {
    it('should return a fresh initial state', () => {
      const modifiedState = { ...initialState, currentPlayerIndex: 1, gameIsOver: true };
      
      const result = gameReducer(modifiedState, { type: 'RESET' });
      
      expect(result.currentPlayerIndex).toBe(0);
      expect(result.gameIsOver).toBe(false);
      expect(result.selectedCard).toBeNull();
    });
  });
});