import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  setGlobalCompletedPileAnimationContext,
  triggerCompletedBuildPileAnimation,
} from '@/services/completedBuildPileAnimationService';
import type { Card, GameState } from '@/types';

const card = (value: number): Card => ({ value, isSkipBo: false });

const createRect = (
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect =>
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

const setElementRect = (
  element: Element,
  rect: DOMRect,
): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
};

const createGameState = (): GameState => ({
  deck: [],
  buildPiles: [[], [], [], []],
  completedBuildPiles: [],
  players: [
    {
      isAI: false,
      stockPile: [],
      hand: [null, null, null, null, null],
      discardPiles: [[], [], [], []],
    },
    {
      isAI: true,
      stockPile: [],
      hand: [null, null, null, null, null],
      discardPiles: [[], [], [], []],
    },
  ],
  currentPlayerIndex: 0,
  gameIsOver: false,
  winnerIndex: null,
  selectedCard: null,
  message: '',
  config: {
    BUILD_PILES_COUNT: 4,
    CARD_VALUES_MAX: 12,
    CARD_VALUES_MIN: 1,
    CARD_VALUES_SKIP_BO: 0,
    DECK_SIZE: 162,
    DISCARD_PILES_COUNT: 4,
    HAND_SIZE: 5,
    SKIP_BO_CARDS: 18,
    STOCK_SIZE: 30,
  },
});

describe('completedBuildPileAnimationService', () => {
  const startAnimation = vi.fn((animation: { initialDelay: number }) => {
    void animation;
    return 'animation-id';
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    startAnimation.mockClear();
    setGlobalCompletedPileAnimationContext({ startAnimation });

    const centerArea = document.createElement('div');
    centerArea.className = 'center-area';
    setElementRect(centerArea, createRect(0, 0, 400, 200));

    const buildPile = document.createElement('div');
    buildPile.setAttribute('data-build-pile', '0');
    setElementRect(buildPile, createRect(0, 0, 80, 120));

    const retreatPile = document.createElement('div');
    retreatPile.setAttribute('data-retreat-pile', '');
    setElementRect(retreatPile, createRect(200, 0, 80, 120));

    centerArea.append(buildPile, retreatPile);
    document.body.append(centerArea);
  });

  afterEach(() => {
    setGlobalCompletedPileAnimationContext(null);
  });

  it('schedules completed build pile cards sequentially instead of overlapping them', () => {
    const totalDuration = triggerCompletedBuildPileAnimation(
      createGameState(),
      0,
      [card(10), card(11), card(12)],
      4,
    );

    expect(startAnimation).toHaveBeenCalledTimes(3);

    expect(startAnimation.mock.calls.map(([animation]) => animation.initialDelay)).toEqual([0, 500, 1000]);
    expect(totalDuration).toBe(1400);
  });
});
