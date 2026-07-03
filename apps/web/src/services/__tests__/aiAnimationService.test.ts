import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialGameState, type GameState } from '@skipbo/game-core';

import { triggerAIAnimation } from '@/services/aiAnimationService';

const createRect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  }) as DOMRect;

const setElementRect = (element: Element, rect: DOMRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => rect });
};

const mountAiBoard = (): void => {
  const playerArea = document.createElement('div');
  playerArea.className = 'player-area';
  playerArea.setAttribute('data-player-index', '1');

  const handArea = document.createElement('div');
  handArea.className = 'hand-area';
  setElementRect(handArea, createRect(120, 20, 360, 120));
  handArea.style.setProperty('--card-width', '80px');
  handArea.style.setProperty('--card-height', '120px');
  const holder = document.createElement('div');
  holder.setAttribute('data-card-index', '0');
  const handCard = document.createElement('div');
  handCard.className = 'card';
  setElementRect(handCard, createRect(160, 12, 80, 120));
  holder.appendChild(handCard);
  handArea.appendChild(holder);
  playerArea.appendChild(handArea);

  const discardPiles = document.createElement('div');
  discardPiles.className = 'discard-piles';
  const pile = document.createElement('div');
  pile.setAttribute('data-pile-index', '0');
  pile.style.setProperty('--stack-diff', '20px');
  setElementRect(pile, createRect(160, 200, 80, 140));
  discardPiles.appendChild(pile);
  playerArea.appendChild(discardPiles);

  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));
  const buildPile = document.createElement('div');
  buildPile.setAttribute('data-build-pile', '0');
  setElementRect(buildPile, createRect(420, 120, 80, 120));
  centerArea.appendChild(buildPile);

  document.body.append(playerArea, centerArea);
};

const aiPlayState = (): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 1;
  state.players[1].hand = [{ value: 1, isSkipBo: false }, null, null, null, null];
  state.selectedCard = { card: { value: 1, isSkipBo: false }, source: 'hand', index: 0 };
  return state;
};

describe('triggerAIAnimation', () => {
  const startAnimation = vi.fn((animation: { animationType: string }) => {
    void animation;
    return 'animation-id';
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    startAnimation.mockClear();
  });

  it('animates an AI hand play to the build pile and returns its duration', () => {
    mountAiBoard();

    const duration = triggerAIAnimation({ startAnimation }, aiPlayState(), { type: 'PLAY_CARD', buildPile: 0 });

    expect(duration).toBeGreaterThan(0);
    expect(startAnimation).toHaveBeenCalledTimes(1);
    expect(startAnimation.mock.calls[0][0]).toMatchObject({ animationType: 'play' });
  });

  it('animates an AI discard to the discard pile', () => {
    mountAiBoard();

    const duration = triggerAIAnimation({ startAnimation }, aiPlayState(), { type: 'DISCARD_CARD', discardPile: 0 });

    expect(duration).toBeGreaterThan(0);
    expect(startAnimation.mock.calls[0][0]).toMatchObject({ animationType: 'discard' });
  });

  it('ignores non-AI turns and missing DOM', () => {
    const humanTurn = aiPlayState();
    humanTurn.currentPlayerIndex = 0;
    expect(triggerAIAnimation({ startAnimation }, humanTurn, { type: 'PLAY_CARD', buildPile: 0 })).toBe(0);

    expect(triggerAIAnimation({ startAnimation }, aiPlayState(), { type: 'PLAY_CARD', buildPile: 0 })).toBe(0);
    expect(startAnimation).not.toHaveBeenCalled();
  });
});
