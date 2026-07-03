import { describe, expect, it, vi } from 'vitest';
import { createActor, waitFor } from 'xstate';

import type { Card } from '@skipbo/game-core';

import { gameMachine } from '@/state/gameMachine';
import type { AnimationDriver } from '@/services/animationDriver';

const { computeBestMove } = vi.hoisted(() => ({ computeBestMove: vi.fn() }));

vi.mock('@/ai/computeBestMove', () => ({ computeBestMove }));

const card = (value: number): Card => ({ value, isSkipBo: false });

const makeDriver = (): AnimationDriver => ({
  startAnimation: vi.fn(() => 'id'),
  removeAnimation: vi.fn(),
  waitForAnimations: vi.fn(async () => undefined),
  animateMove: vi.fn(() => 0),
  animateDraws: vi.fn(async () => 0),
  calculateDrawsDuration: vi.fn(() => 0),
  animateCompletion: vi.fn(() => 0),
});

describe('gameMachine with an injected AnimationDriver', () => {
  it('uses the debugAiHand override instead of drawing on the AI turn', async () => {
    const driver = makeDriver();
    const debugAiHand = [card(1), card(2), card(3), card(4), card(5)];
    computeBestMove.mockResolvedValue({ type: 'END_TURN' });

    const actor = createActor(gameMachine, { input: { driver, debugAiHand } });
    actor.start();
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    actor.send({ type: 'END_TURN' });
    await waitFor(actor, (state) => state.matches('humanTurn.ready') && state.context.G.currentPlayerIndex === 0);

    // The AI turn started from the forced hand, not from a deck draw.
    expect(
      actor
        .getSnapshot()
        .context.G.players[1].hand.slice(0, 5)
        .map((c) => c?.value),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('animates an emptying AI play through the driver: move, completion wait, then refill draws', async () => {
    const driver = makeDriver();
    // Force the AI hand to a single playable card so the play empties the hand.
    const debugAiHand = [card(1)];
    let aiMoves = 0;
    computeBestMove.mockImplementation(async ({ selectedCard, currentPlayerIndex, players }) => {
      if (!players[currentPlayerIndex].isAI) {
        return { type: 'END_TURN' };
      }
      aiMoves += 1;
      if (aiMoves > 3) {
        return { type: 'END_TURN' };
      }
      return selectedCard ? { type: 'PLAY_CARD', buildPile: 0 } : { type: 'SELECT_CARD', source: 'hand', index: 0 };
    });

    const actor = createActor(gameMachine, { input: { driver, debugAiHand } });
    actor.start();
    await waitFor(actor, (state) => state.matches('humanTurn.ready'));

    actor.send({ type: 'END_TURN' });
    await waitFor(actor, (state) => state.matches('humanTurn.ready') && state.context.G.currentPlayerIndex === 0, {
      timeout: 5000,
    });

    // The play animation and its wait ran through the injected driver…
    expect(driver.animateMove).toHaveBeenCalled();
    expect(driver.waitForAnimations).toHaveBeenCalled();
    // …and the empty-hand refill was animated from the shared refill plan.
    expect(driver.animateDraws).toHaveBeenCalled();
    const refillCall = vi.mocked(driver.animateDraws).mock.calls.at(-1)!;
    expect(refillCall[0]).toBe(1); // AI player index
    expect(refillCall[2].length).toBeGreaterThan(0); // refilled hand slots
    // The card actually landed on the build pile.
    expect(actor.getSnapshot().context.G.buildPiles[0].length).toBeGreaterThan(0);
  });
});
