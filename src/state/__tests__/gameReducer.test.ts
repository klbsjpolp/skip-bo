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
      // Start with empty hand to allow drawing
      const stateWithEmptyHand = {
        ...initialState,
        players: [
          {
            ...initialState.players[0],
            hand: [null, null, null, null, null] // Empty hand
          },
          initialState.players[1]
        ]
      };

      const deckSizeBefore = stateWithEmptyHand.deck.length;
      const handSizeBefore = stateWithEmptyHand.players[0].hand.filter(c => !!c).length;

      const result = gameReducer(stateWithEmptyHand, { type: 'DRAW' });

      expect(result.players[0].hand.filter(c => !!c)).toHaveLength(handSizeBefore + 5);
      expect(result.deck).toHaveLength(deckSizeBefore - 5);
    });

    it('should draw specified number of cards', () => {
      // Start with hand that has room for more cards
      const stateWithPartialHand = {
        ...initialState,
        players: [
          {
            ...initialState.players[0],
            hand: [{ value: 1, isSkipBo: false }, { value: 2, isSkipBo: false }, null, null, null] // Only 2 cards
          },
          initialState.players[1]
        ]
      };

      const deckSizeBefore = stateWithPartialHand.deck.length;
      const handSizeBefore = stateWithPartialHand.players[0].hand.filter(c => !!c).length;

      const result = gameReducer(stateWithPartialHand, { type: 'DRAW', count: 3 });

      expect(result.players[0].hand.filter(c => !!c)).toHaveLength(handSizeBefore + 3);
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
            hand: [{ value: 1, isSkipBo: false }, null, null, null, null]
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
      expect(result.players[0].hand.filter(c => !!c)).toHaveLength(5);
      expect(result.selectedCard).toBeNull();
    });

    it('should play a valid card on top of a skip bo card to build pile', () => {
      // Create a state with Skip-Bo and regular card in hand, plus some other cards to prevent auto-draw
      const stateWithCards = {
        ...initialState,
        players: [
          {
            ...initialState.players[0],
            hand: [
              { value: 0, isSkipBo: true },
              { value: 3, isSkipBo: false },
              { value: 4, isSkipBo: false }, // Add extra cards to prevent auto-draw
              { value: 5, isSkipBo: false },
              { value: 6, isSkipBo: false }
            ]
          },
          initialState.players[1]
        ],
        buildPiles: [
          [{ value: 1, isSkipBo: false }], // Build pile with 1
        ]
      };

      // Select the skip-bo card
      const stateWithFirstSelection = gameReducer(stateWithCards, {
        type: 'SELECT_CARD',
        source: 'hand',
        index: 0
      });

      // Play the Skip-Bo card as 2
      const stateAfterFirstPlay = gameReducer(stateWithFirstSelection, { type: 'PLAY_CARD', buildPile: 0 });

      expect(stateAfterFirstPlay.buildPiles[0]).toHaveLength(2);
      expect(stateAfterFirstPlay.buildPiles[0][1].isSkipBo).toBe(true);
      expect(stateAfterFirstPlay.players[0].hand.filter(c => !!c)).toHaveLength(4); // 4 cards left (no auto-draw)
      expect(stateAfterFirstPlay.selectedCard).toBeNull();

      // Now select the 3 from the updated state (still at index 1 since Skip-Bo was set to null, not removed)
      const stateWithSecondSelection = gameReducer(stateAfterFirstPlay, {
        type: 'SELECT_CARD',
        source: 'hand',
        index: 1 // The 3 is still at index 1 since Skip-Bo was set to null
      });

      // Play the 3
      const stateAfterSecondPlay = gameReducer(stateWithSecondSelection, { type: 'PLAY_CARD', buildPile: 0 });

      // Hand should now have 3 cards (no auto-draw since hand wasn't empty)
      expect(stateAfterSecondPlay.players[0].hand.filter(c => !!c)).toHaveLength(3);
      expect(stateAfterSecondPlay.buildPiles[0]).toHaveLength(3);
      expect(stateAfterSecondPlay.buildPiles[0][2].value).toBe(3);
      expect(stateAfterSecondPlay.selectedCard).toBeNull();
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
            hand: [{ value: 5, isSkipBo: false }, null, null, null, null] // Only 1 card in hand
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
      expect(result.players[0].hand.filter(c => !!c)).toHaveLength(0);
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

  describe('Deck reshuffling behaviors', () => {
    describe('DRAW action with deck exhaustion', () => {
      it('should draw from deck first, then reshuffle completed build piles when deck is empty', () => {
        // Create a state with only 2 cards in deck and some completed build piles
        const stateWithLowDeck = {
          ...initialState,
          deck: [
            { value: 1, isSkipBo: false },
            { value: 2, isSkipBo: false }
          ],
          completedBuildPiles: [
            { value: 3, isSkipBo: false },
            { value: 4, isSkipBo: false },
            { value: 5, isSkipBo: true }, // Skip-Bo card should maintain identity
            { value: 6, isSkipBo: false }
          ],
          players: [
            {
              ...initialState.players[0],
              hand: [null, null, null, null, null] // Empty hand to allow drawing
            },
            initialState.players[1]
          ]
        };

        const result = gameReducer(stateWithLowDeck, { type: 'DRAW', count: 4 });

        // Should have drawn 4 cards total
        expect(result.players[0].hand.filter(c => !!c)).toHaveLength(4);
        // Deck should have remaining cards after reshuffling
        expect(result.deck.length).toBeGreaterThan(0);
        // Completed build piles should be empty (moved to deck)
        expect(result.completedBuildPiles).toHaveLength(0);
      });

      it('should only draw from existing deck if completed build piles are empty', () => {
        const stateWithLowDeck = {
          ...initialState,
          deck: [{ value: 1, isSkipBo: false }],
          completedBuildPiles: [],
          players: [
            {
              ...initialState.players[0],
              hand: [null, null, null, null, null] // Empty hand to allow drawing
            },
            initialState.players[1]
          ]
        };

        const result = gameReducer(stateWithLowDeck, { type: 'DRAW', count: 3 });

        // Should only draw the 1 available card
        expect(result.players[0].hand.filter(c => !!c)).toHaveLength(1);
        expect(result.deck).toHaveLength(0);
        expect(result.completedBuildPiles).toHaveLength(0);
      });
    });

    describe('PLAY_CARD with build pile completion', () => {
      it('should move completed build pile to completedBuildPiles when reaching 12 cards', () => {
        // Create a build pile with 11 cards
        const buildPileWith11Cards = Array.from({ length: 11 }, (_, i) => ({
          value: i + 1,
          isSkipBo: false
        }));

        const stateWith11Cards = {
          ...initialState,
          buildPiles: [buildPileWith11Cards, [], [], []],
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 12, isSkipBo: false }, null, null, null, null] // Only 1 card in hand
            },
            initialState.players[1]
          ]
        };

        // Select and play the 12th card
        const stateWithSelection = gameReducer(stateWith11Cards, {
          type: 'SELECT_CARD',
          source: 'hand',
          index: 0
        });

        const result = gameReducer(stateWithSelection, {
          type: 'PLAY_CARD',
          buildPile: 0
        });

        // Build pile should be empty
        expect(result.buildPiles[0]).toHaveLength(0);
        // Completed build piles should have 12 cards
        expect(result.completedBuildPiles).toHaveLength(12);
        // Verify the completed cards maintain their properties
        expect(result.completedBuildPiles[0].value).toBe(1);
        expect(result.completedBuildPiles[11].value).toBe(12);
      });

      it('should preserve Skip-Bo identity when completing build pile', () => {
        // Create a build pile with Skip-Bo cards
        const buildPileWithSkipBo = [
          { value: 1, isSkipBo: false },
          { value: 2, isSkipBo: true }, // Skip-Bo played as 2
          { value: 3, isSkipBo: false },
          { value: 4, isSkipBo: true }, // Skip-Bo played as 4
          ...Array.from({ length: 7 }, (_, i) => ({ value: i + 5, isSkipBo: false }))
        ];

        const stateWithSkipBoCards = {
          ...initialState,
          buildPiles: [buildPileWithSkipBo, [], [], []],
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 12, isSkipBo: false }, null, null, null, null] // Only 1 card in hand
            },
            initialState.players[1]
          ]
        };

        const stateWithSelection = gameReducer(stateWithSkipBoCards, {
          type: 'SELECT_CARD',
          source: 'hand',
          index: 0
        });

        const result = gameReducer(stateWithSelection, {
          type: 'PLAY_CARD',
          buildPile: 0
        });

        // Find the Skip-Bo cards in completed build piles
        const skipBoCards = result.completedBuildPiles.filter(card => card.isSkipBo);
        expect(skipBoCards).toHaveLength(2);
        expect(skipBoCards[0].isSkipBo).toBe(true);
        expect(skipBoCards[1].isSkipBo).toBe(true);
      });
    });

    describe('PLAY_CARD with empty hand auto-draw', () => {
      it('should auto-draw from deck and completed build piles when hand becomes empty', () => {
        const stateWithOneCard = {
          ...initialState,
          deck: [{ value: 1, isSkipBo: false }], // Only 1 card in deck
          completedBuildPiles: [
            { value: 2, isSkipBo: false },
            { value: 3, isSkipBo: true },
            { value: 4, isSkipBo: false },
            { value: 5, isSkipBo: false }, // Add more cards so deck isn't empty after drawing
            { value: 6, isSkipBo: false }
          ],
          buildPiles: [[], [], [], []],
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 1, isSkipBo: false }, null, null, null, null] // Only 1 card in hand
            },
            initialState.players[1]
          ]
        };

        const stateWithSelection = gameReducer(stateWithOneCard, {
          type: 'SELECT_CARD',
          source: 'hand',
          index: 0
        });

        const result = gameReducer(stateWithSelection, {
          type: 'PLAY_CARD',
          buildPile: 0
        });

        // Should auto-draw 5 cards (1 from deck + 4 from reshuffled completed piles, but limited to 5 total)
        expect(result.players[0].hand.filter(c => !!c)).toHaveLength(5);
        // Completed build piles should be empty
        expect(result.completedBuildPiles).toHaveLength(0);
        // Deck should have remaining cards after reshuffle (1 card left)
        expect(result.deck.length).toBeGreaterThan(0);
      });
    });

    describe('END_TURN with deck exhaustion', () => {
      it('should reshuffle completed build piles when drawing for next player', () => {
        const stateForEndTurn = {
          ...initialState,
          deck: [{ value: 1, isSkipBo: false }], // Only 1 card in deck
          completedBuildPiles: [
            { value: 2, isSkipBo: false },
            { value: 3, isSkipBo: true },
            { value: 4, isSkipBo: false },
            { value: 5, isSkipBo: false }, // Add more cards so deck isn't empty after drawing
            { value: 6, isSkipBo: false },
            { value: 7, isSkipBo: false }
          ],
          currentPlayerIndex: 0,
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 8, isSkipBo: false }, { value: 9, isSkipBo: false }, null, null, null] // 2 cards, needs 3 more
            },
            {
              ...initialState.players[1],
              hand: [{ value: 10, isSkipBo: false }, null, null, null, null] // AI needs 4 more cards
            }
          ]
        };

        const result = gameReducer(stateForEndTurn, { type: 'END_TURN' });

        // Should switch to AI player
        expect(result.currentPlayerIndex).toBe(1);
        // AI should have full hand (1 existing + 4 drawn = 5 total)
        expect(result.players[1].hand.filter(c => !!c)).toHaveLength(5);
        // Completed build piles should be empty
        expect(result.completedBuildPiles).toHaveLength(0);
        // Deck should have remaining cards (2 cards left after drawing 5 total)
        expect(result.deck.length).toBeGreaterThan(0);
      });
    });

    describe('Skip-Bo card preservation in build piles', () => {
      it('should preserve Skip-Bo identity when adding to build pile', () => {
        const stateWithSkipBo = {
          ...initialState,
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 0, isSkipBo: true }, null, null, null, null] // Skip-Bo card
            },
            initialState.players[1]
          ]
        };

        const stateWithSelection = gameReducer(stateWithSkipBo, {
          type: 'SELECT_CARD',
          source: 'hand',
          index: 0
        });

        const result = gameReducer(stateWithSelection, {
          type: 'PLAY_CARD',
          buildPile: 0
        });

        // Card in build pile should maintain Skip-Bo identity
        expect(result.buildPiles[0]).toHaveLength(1);
        expect(result.buildPiles[0][0].isSkipBo).toBe(true);
        // But validation should still work for sequential play
      });

      it('should allow Skip-Bo to be played as any needed sequential value', () => {
        // Create build pile with cards 1-3
        const buildPilePartial = [
          { value: 1, isSkipBo: false },
          { value: 2, isSkipBo: false },
          { value: 3, isSkipBo: false }
        ];

        const stateWithPartialPile = {
          ...initialState,
          buildPiles: [buildPilePartial, [], [], []],
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 0, isSkipBo: true }, null, null, null, null] // Skip-Bo should work as 4
            },
            initialState.players[1]
          ]
        };

        const stateWithSelection = gameReducer(stateWithPartialPile, {
          type: 'SELECT_CARD',
          source: 'hand',
          index: 0
        });

        const result = gameReducer(stateWithSelection, {
          type: 'PLAY_CARD',
          buildPile: 0
        });

        // Build pile should now have 4 cards
        expect(result.buildPiles[0]).toHaveLength(4);
        // The Skip-Bo card should maintain its identity
        expect(result.buildPiles[0][3].isSkipBo).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle drawing when both deck and completed build piles are empty', () => {
        const emptyState = {
          ...initialState,
          deck: [],
          completedBuildPiles: [],
          players: [
            {
              ...initialState.players[0],
              hand: [null, null, null, null, null] // Empty hand to allow drawing
            },
            initialState.players[1]
          ]
        };

        const result = gameReducer(emptyState, { type: 'DRAW', count: 5 });

        // Should not crash and hand should remain empty
        expect(result.players[0].hand.filter(c => !!c)).toHaveLength(0);
        expect(result.deck).toHaveLength(0);
        expect(result.completedBuildPiles).toHaveLength(0);
      });

      it('should handle multiple build pile completions in sequence', () => {
        // This would happen in actual gameplay over time
        const stateWithMultipleNearComplete = {
          ...initialState,
          completedBuildPiles: [],
          buildPiles: [
            Array.from({ length: 11 }, (_, i) => ({ value: i + 1, isSkipBo: i === 5 })), // 11 cards, one Skip-Bo
            [], [], []
          ],
          players: [
            {
              ...initialState.players[0],
              hand: [{ value: 12, isSkipBo: false }, null, null, null, null]
            },
            initialState.players[1]
          ]
        };

        const stateWithSelection = gameReducer(stateWithMultipleNearComplete, {
          type: 'SELECT_CARD',
          source: 'hand',
          index: 0
        });

        const result = gameReducer(stateWithSelection, {
          type: 'PLAY_CARD',
          buildPile: 0
        });

        expect(result.completedBuildPiles).toHaveLength(12);
        expect(result.buildPiles[0]).toHaveLength(0);
        // Verify Skip-Bo card is preserved
        const skipBoInCompleted = result.completedBuildPiles.find(card => card.isSkipBo);
        expect(skipBoInCompleted).toBeDefined();
      });
    });
  });
});
