import { describe, it, expect, vi } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { gameMachine } from '@/state/gameMachine';
import { gameReducer } from '@/state/gameReducer';
import { GameAction } from '@/state/gameActions';
import { initialGameState } from '@/state/initialGameState';

// Mock the AI module
vi.mock('@/ai/computeBestMove', () => ({
  computeBestMove: vi.fn(() => Promise.resolve({ type: 'END_TURN' }))
}));

// Mock animation services to avoid timing issues in tests
vi.mock('@/services/aiAnimationService', () => ({
  triggerAIAnimation: vi.fn(() => Promise.resolve(0))
}));

vi.mock('@/services/drawAnimationService', () => ({
  triggerMultipleDrawAnimations: vi.fn(() => Promise.resolve(0))
}));

describe('gameMachine', () => {
  it('should start in setup state and transition to humanTurn', async () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Wait for the machine to reach a stable state
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G).toBeDefined();
    expect(actor.getSnapshot().context.G.players).toHaveLength(2);
  });

  it('should handle INIT event from any state', async () => {
    const actor = createActor(gameMachine);
    actor.start();

    // Wait for initial state to stabilize
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Send INIT event
    actor.send({ type: 'INIT' });

    // Wait for state to stabilize after INIT
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(0);
    expect(actor.getSnapshot().context.G.gameIsOver).toBe(false);
  });

  it('should handle SELECT_CARD event in humanTurn state', async () => {
    const actor = createActor(gameMachine);
    actor.start();

    // Wait for the drawing phase to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Send SELECT_CARD event
    actor.send({
      type: 'SELECT_CARD', 
      source: 'hand', 
      index: 0 
    });
    
    const newState = actor.getSnapshot().context.G;
    expect(newState.selectedCard).toBeDefined();
    expect(newState.selectedCard?.source).toBe('hand');
    expect(newState.selectedCard?.index).toBe(0);
  });

  it('should handle CLEAR_SELECTION event', async () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Wait for the drawing phase to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // First select a card
    actor.send({ 
      type: 'SELECT_CARD', 
      source: 'hand', 
      index: 0 
    });
    
    expect(actor.getSnapshot().context.G.selectedCard).toBeDefined();
    
    // Then clear selection
    actor.send({ type: 'CLEAR_SELECTION' });
    
    expect(actor.getSnapshot().context.G.selectedCard).toBeNull();
  });

  it('should transition to botTurn on END_TURN', async () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Wait for the drawing phase to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(0);
    
    // Send END_TURN event
    actor.send({ type: 'END_TURN' });
    
    // Wait for the state to transition to botTurn and stabilize
    await waitFor(actor, (state) =>
      state.matches('botTurn') &&
      state.context.G.currentPlayerIndex === 1
    );

    // After END_TURN, we should be in botTurn with currentPlayerIndex changed to 1
    expect(actor.getSnapshot().matches('botTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(1);
  });

  it('should handle RESET event and return to setup', async () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Wait for initial state
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Modify state
    actor.send({
      type: 'SELECT_CARD',
      source: 'hand',
      index: 0
    });
    
    expect(actor.getSnapshot().context.G.selectedCard).toBeDefined();
    
    // Reset
    actor.send({ type: 'RESET' });

    // Wait for reset to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.selectedCard).toBeNull();
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(0);
  });

  it('should not process events when guard conditions are not met', async () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Wait for the drawing phase to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Set current player to AI (index 1)
    actor.send({ type: 'END_TURN' }); // This changes currentPlayerIndex to 1 and transitions to botTurn
    
    // Wait for the state transition to botTurn
    await waitFor(actor, (state) =>
      state.matches('botTurn') &&
      state.context.G.currentPlayerIndex === 1
    );

    // After END_TURN, we should be in botTurn with currentPlayerIndex changed to 1
    expect(actor.getSnapshot().matches('botTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(1);
    
    // Try to select a card (should not work because it's AI's turn and we're in botTurn)
    const stateBefore = actor.getSnapshot().context.G;
    actor.send({ type: 'SELECT_CARD', source: 'hand', index: 0 });
    const stateAfter = actor.getSnapshot().context.G;

    // The selection should not have happened (state should be unchanged)
    expect(stateAfter.selectedCard).toBe(stateBefore.selectedCard);
    expect(stateAfter.selectedCard).toBeNull();
  });

  it('should handle events sent to finished state', async () => {
    const actor = createActor(gameMachine);
    actor.start();

    // Wait for initial state
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Send INIT event - this should work even in finished state
    actor.send({ type: 'INIT' });

    // Wait for reset to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Should transition back to setup/humanTurn
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.gameIsOver).toBe(false);
  });

  it('should maintain immutability of state', async () => {
    const actor = createActor(gameMachine);
    actor.start();

    // Wait for the drawing phase to complete
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    const initialContext = actor.getSnapshot().context;
    const initialG = initialContext.G;
    
    // Send an event that modifies state
    actor.send({
      type: 'SELECT_CARD',
      source: 'hand', 
      index: 0 
    });

    const newContext = actor.getSnapshot().context;
    const newG = newContext.G;

    // Original state should not be mutated
    expect(initialG).not.toBe(newG);
    expect(initialG.selectedCard).toBeNull();
    expect(newG.selectedCard).toBeDefined();
  });

  it('should handle multiple rapid events without errors', async () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Wait for initial state
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Send multiple events rapidly
    actor.send({ type: 'SELECT_CARD', source: 'hand', index: 0 });
    actor.send({ type: 'CLEAR_SELECTION' });
    actor.send({ type: 'SELECT_CARD', source: 'hand', index: 1 });
    actor.send({ type: 'CLEAR_SELECTION' });
    actor.send({ type: 'INIT' });

    // Wait for all events to be processed
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Should still be in a valid state
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G).toBeDefined();
  });

  it('should draw cards for AI player at beginning of turn when hand has empty slots', async () => {
    // Test the core drawing logic directly with the game reducer
    const initialState = initialGameState();

    // Manually set up AI with empty slots
    initialState.players[1].hand = [
      { value: 1, isSkipBo: false }, // AI has only 1 card
      null, null, null, null // 4 empty slots that should be filled
    ];
    initialState.currentPlayerIndex = 1; // Switch to AI turn

    // Verify the initial setup
    expect(initialState.players[1].hand.filter(c => !!c)).toHaveLength(1);
    expect(initialState.players[1].hand.filter(c => c === null)).toHaveLength(4);

    // Test the DRAW action directly
    const drawAction: GameAction = { type: 'DRAW' };
    const stateAfterDraw = gameReducer(initialState, drawAction);

    // AI should now have a full hand (5 cards)
    const aiPlayer = stateAfterDraw.players[1];
    expect(aiPlayer.hand.filter(c => !!c)).toHaveLength(5);
    expect(aiPlayer.hand.filter(c => c === null)).toHaveLength(0);

    // Verify deck was depleted correctly (4 cards drawn)
    expect(initialState.deck.length - stateAfterDraw.deck.length).toBe(4);
  });

  it('should NOT draw at the beginning of AI turn', async () => {
    const actor = createActor(gameMachine);
    actor.start();

    // Wait for initial human turn setup
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    // Check that AI already has a full hand initially
    const initialState = actor.getSnapshot().context.G;
    const initialAIHand = initialState.players[1].hand;
    const initialDeckSize = initialState.deck.length;

    // Ensure AI has full hand initially
    expect(initialAIHand.filter(c => !!c)).toHaveLength(5);

    // Send END_TURN to switch to AI
    actor.send({ type: 'END_TURN' });

    // Wait for AI turn to start
    await waitFor(actor, (state) => state.matches('botTurn'), {
      timeout: 2000
    });

    // AI should NOT have drawn any additional cards
    const finalState = actor.getSnapshot().context.G;
    const finalAIHand = finalState.players[1].hand;
    const finalDeckSize = finalState.deck.length;

    // Hand should still have 5 cards
    expect(finalAIHand.filter(c => !!c)).toHaveLength(5);
    // Deck size should be unchanged
    expect(finalDeckSize).toBe(initialDeckSize);
  });
});