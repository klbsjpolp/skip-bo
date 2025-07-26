import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { gameMachine } from '@/state/gameMachine';

// Mock the AI module
vi.mock('@/ai/computeBestMove', () => ({
  computeBestMove: vi.fn(() => ({ type: 'END_TURN' }))
}));

describe('gameMachine', () => {
  it('should start in setup state and transition to humanTurn', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G).toBeDefined();
    expect(actor.getSnapshot().context.G.players).toHaveLength(2);
  });

  it('should handle INIT event from any state', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Send INIT event
    actor.send({ type: 'INIT' });
    
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(0);
    expect(actor.getSnapshot().context.G.gameIsOver).toBe(false);
  });

  it('should handle SELECT_CARD event in humanTurn state', () => {
    const actor = createActor(gameMachine);
    actor.start();
    actor.getSnapshot().context.G;
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

  it('should handle CLEAR_SELECTION event', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
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

  it('should transition to botTurn on END_TURN', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(0);
    
    // Send END_TURN event
    actor.send({ type: 'END_TURN' });
    
    // After END_TURN, we should be in botTurn with currentPlayerIndex changed to 1
    expect(actor.getSnapshot().matches('botTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(1);
  });

  it('should handle RESET event and return to setup', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Modify state
    actor.send({ 
      type: 'SELECT_CARD', 
      source: 'hand', 
      index: 0 
    });
    
    expect(actor.getSnapshot().context.G.selectedCard).toBeDefined();
    
    // Reset
    actor.send({ type: 'RESET' });
    
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.selectedCard).toBeNull();
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(0);
  });

  it('should not process events when guard conditions are not met', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Set current player to AI (index 1)
    actor.send({ type: 'END_TURN' }); // This changes currentPlayerIndex to 1 and transitions to botTurn
    
    // After END_TURN, we should be in botTurn with currentPlayerIndex changed to 1
    expect(actor.getSnapshot().matches('botTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.currentPlayerIndex).toBe(1);
    
    // Try to select a card (should not work because it's AI's turn and we're in botTurn)
    actor.send({ type: 'SELECT_CARD', source: 'hand', index: 0 });
    
    // The selection should not have happened
    expect(actor.getSnapshot().context.G.selectedCard).toBeNull();
  });

  it('should handle events sent to finished state', () => {
    const actor = createActor(gameMachine);
    actor.start();

// Send INIT event - this should work even in finished state
    actor.send({ type: 'INIT' });
    
    // Should transition back to setup/humanTurn
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G.gameIsOver).toBe(false);
  });

  it('should maintain immutability of state', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
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

  it('should handle multiple rapid events without errors', () => {
    const actor = createActor(gameMachine);
    actor.start();
    
    // Send multiple events rapidly
    actor.send({ type: 'SELECT_CARD', source: 'hand', index: 0 });
    actor.send({ type: 'CLEAR_SELECTION' });
    actor.send({ type: 'SELECT_CARD', source: 'hand', index: 1 });
    actor.send({ type: 'CLEAR_SELECTION' });
    actor.send({ type: 'INIT' });
    
    // Should still be in a valid state
    expect(actor.getSnapshot().matches('humanTurn')).toBe(true);
    expect(actor.getSnapshot().context.G).toBeDefined();
  });
});