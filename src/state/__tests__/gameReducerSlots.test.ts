import {beforeEach, describe, expect, test } from 'vitest';
import { gameReducer } from '../gameReducer';
import { initialGameState } from '../initialGameState';
import { GameState, Card } from '@/types';

describe('Game Reducer - Hand Slots', () => {
  let state: GameState;

  beforeEach(() => {
    // Start with a fresh game state
    state = initialGameState();
    
    // Ensure we have a predictable hand for testing
    const testHand: Card[] = [
      { value: 1, isSkipBo: false },
      { value: 2, isSkipBo: false },
      { value: 3, isSkipBo: false },
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false }
    ];
    
    // Set up a test hand and ensure build piles can accept these cards
    state.players[0].hand = [...testHand];
    state.buildPiles[0] = []; // Empty build pile to play on
  });

  test('playing a card sets the slot to null instead of removing it', () => {
    // Select a card from hand
    state = gameReducer(state, {
      type: 'SELECT_CARD',
      source: 'hand',
      index: 2 // Select the third card (value 3)
    });

    // Play the selected card
    state = gameReducer(state, {
      type: 'DISCARD_CARD',
      discardPile: 0
    });

    // Check that the hand still has 5 slots
    expect(state.players[0].hand.length).toBe(5);
    
    // Check that the played card's slot is now null
    expect(state.players[0].hand[2]).toBeNull();
    
    // Check that other cards are still in their positions
    expect(state.players[0].hand[0]).toEqual({ value: 1, isSkipBo: false });
    expect(state.players[0].hand[1]).toEqual({ value: 2, isSkipBo: false });
    expect(state.players[0].hand[3]).toEqual({ value: 4, isSkipBo: false });
    expect(state.players[0].hand[4]).toEqual({ value: 5, isSkipBo: false });
  });

  test('discarding a card sets the slot to null instead of removing it', () => {
    // Select a card from hand
    state = gameReducer(state, {
      type: 'SELECT_CARD',
      source: 'hand',
      index: 1 // Select the second card (value 2)
    });

    // Discard the selected card
    state = gameReducer(state, {
      type: 'DISCARD_CARD',
      discardPile: 0
    });

    // Check that the hand still has 5 slots
    expect(state.players[0].hand.length).toBe(5);
    
    // Check that the discarded card's slot is now null
    expect(state.players[0].hand[1]).toBeNull();
    
    // Check that other cards are still in their positions
    expect(state.players[0].hand[0]).toEqual({ value: 1, isSkipBo: false });
    expect(state.players[0].hand[2]).toEqual({ value: 3, isSkipBo: false });
    expect(state.players[0].hand[3]).toEqual({ value: 4, isSkipBo: false });
    expect(state.players[0].hand[4]).toEqual({ value: 5, isSkipBo: false });
  });

  test('drawing cards fills empty slots first', () => {
    // Create some empty slots
    state.players[0].hand[1] = null;
    state.players[0].hand[3] = null;
    
    // Add some cards to the deck for drawing
    state.deck = [
      { value: 6, isSkipBo: false },
      { value: 7, isSkipBo: false },
      { value: 8, isSkipBo: false }
    ];
    
    // Draw cards
    state = gameReducer(state, { type: 'DRAW' });
    
    // Check that empty slots were filled
    expect(state.players[0].hand[1]).toEqual({ value: 6, isSkipBo: false });
    expect(state.players[0].hand[3]).toEqual({ value: 7, isSkipBo: false });
    
    // Check that other cards are still in their positions
    expect(state.players[0].hand[0]).toEqual({ value: 1, isSkipBo: false });
    expect(state.players[0].hand[2]).toEqual({ value: 3, isSkipBo: false });
    expect(state.players[0].hand[4]).toEqual({ value: 5, isSkipBo: false });
    
    // Check that the deck has one card left
    expect(state.deck.length).toBe(1);
    expect(state.deck[0]).toEqual({ value: 8, isSkipBo: false });
  });

  test('drawing after playing all cards refills the entire hand', () => {
    // Make all slots empty
    state.players[0].hand = [null, null, null, null, null];
    
    // Add cards to the deck for drawing
    state.deck = [
      { value: 6, isSkipBo: false },
      { value: 7, isSkipBo: false },
      { value: 8, isSkipBo: false },
      { value: 9, isSkipBo: false },
      { value: 10, isSkipBo: false }
    ];
    
    // Draw cards
    state = gameReducer(state, { type: 'DRAW' });
    
    // Check that all slots were filled
    expect(state.players[0].hand[0]).toEqual({ value: 6, isSkipBo: false });
    expect(state.players[0].hand[1]).toEqual({ value: 7, isSkipBo: false });
    expect(state.players[0].hand[2]).toEqual({ value: 8, isSkipBo: false });
    expect(state.players[0].hand[3]).toEqual({ value: 9, isSkipBo: false });
    expect(state.players[0].hand[4]).toEqual({ value: 10, isSkipBo: false });
    
    // Check that the deck is now empty
    expect(state.deck.length).toBe(0);
  });
});