import { describe, expect, it } from 'vitest';

import { isSafeToApplyLocalUpdate } from '@/lib/localUpdateGate';
import { initialGameState } from '@skipbo/game-core';
import type { Card } from '@skipbo/game-core';

const card: Card = { value: 5, isSkipBo: false };

describe('isSafeToApplyLocalUpdate', () => {
  it('is safe on a freshly dealt, untouched game', () => {
    expect(isSafeToApplyLocalUpdate(initialGameState())).toBe(true);
  });

  it('is not safe once the game is over', () => {
    expect(isSafeToApplyLocalUpdate({ ...initialGameState(), gameIsOver: true })).toBe(false);
  });

  it('is not safe once a card has been played to a build pile', () => {
    const gameState = initialGameState();
    gameState.buildPiles[0] = [card];
    expect(isSafeToApplyLocalUpdate(gameState)).toBe(false);
  });

  it('is not safe once a build pile has been completed', () => {
    const gameState = initialGameState();
    gameState.completedBuildPiles = [card];
    expect(isSafeToApplyLocalUpdate(gameState)).toBe(false);
  });

  it('is not safe once a player has discarded', () => {
    const gameState = initialGameState();
    gameState.players[0].discardPiles[0] = [card];
    expect(isSafeToApplyLocalUpdate(gameState)).toBe(false);
  });
});
