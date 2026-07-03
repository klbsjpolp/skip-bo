import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialGameState, type Card, type GameState } from '@skipbo/game-core';

import type { CardAnimationData } from '@/contexts/CardAnimationContext';
import { startDiscardCardAnimation, startPlayCardAnimation } from '@/game/moveAnimations';
import type { CardPosition } from '@/utils/cardPositions';

vi.mock('@/services/dragCommitOverride', () => ({
  consumeDragCommitOverride: vi.fn((): { startPosition: CardPosition } | null => null),
}));

import { consumeDragCommitOverride } from '@/services/dragCommitOverride';

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const makeDriver = () => ({
  startAnimation: vi.fn<(data: Omit<CardAnimationData, 'id'>) => string>(() => 'id'),
  animateCompletion: vi.fn(() => 0),
});

const firstAnimationArg = (mock: ReturnType<typeof makeDriver>['startAnimation']): Omit<CardAnimationData, 'id'> => {
  const animation = mock.mock.calls[0]?.[0];
  expect(animation).toBeDefined();
  return animation!;
};

const createRect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const setElementRect = (element: Element, rect: DOMRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => rect });
};

/** Builds the player-area / center-area structure all three card sources read. */
const mountAnimationDom = (): void => {
  const opponentArea = document.createElement('div');
  opponentArea.className = 'player-area';
  opponentArea.dataset.playerIndex = '1';

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';
  activePlayerArea.dataset.playerIndex = '0';

  const handArea = document.createElement('div');
  handArea.className = 'hand-area';
  setElementRect(handArea, createRect(120, 420, 360, 120));
  handArea.style.setProperty('--card-width', '80px');
  handArea.style.setProperty('--card-height', '120px');
  const cardHolder = document.createElement('div');
  cardHolder.setAttribute('data-card-index', '0');
  const handCard = document.createElement('div');
  handCard.className = 'card selected';
  setElementRect(handCard, createRect(160, 412, 80, 120));
  cardHolder.appendChild(handCard);
  handArea.appendChild(cardHolder);

  const stockPile = document.createElement('div');
  stockPile.className = 'stock-pile';
  setElementRect(stockPile, createRect(40, 100, 80, 120));
  const stockCard = document.createElement('div');
  stockCard.className = 'card';
  setElementRect(stockCard, createRect(40, 100, 80, 120));
  stockPile.appendChild(stockCard);

  const discardPiles = document.createElement('div');
  discardPiles.className = 'discard-piles';
  for (const index of [0, 1, 2, 3]) {
    const pile = document.createElement('div');
    pile.setAttribute('data-pile-index', String(index));
    pile.style.setProperty('--stack-diff', '20px');
    setElementRect(pile, createRect(160 + index * 100, 100, 80, 140));
    const top = document.createElement('div');
    top.className = 'card';
    setElementRect(top, createRect(160 + index * 100, 120, 80, 120));
    pile.appendChild(top);
    discardPiles.appendChild(pile);
  }

  activePlayerArea.append(handArea, stockPile, discardPiles);

  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));
  const buildPile = document.createElement('div');
  buildPile.setAttribute('data-build-pile', '0');
  setElementRect(buildPile, createRect(420, 120, 80, 120));
  centerArea.appendChild(buildPile);

  document.body.append(opponentArea, activePlayerArea, centerArea);
};

const baseState = (selectedSource: 'hand' | 'stock' | 'discard', discardPileIndex?: number): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 0;
  state.buildPiles = [[], [], [], []];
  state.completedBuildPiles = [];
  state.players[0].hand = [card(1), null, null, null, null];
  state.players[0].stockPile = [card(5), card(1)];
  state.players[0].discardPiles = [[card(3)], [], [], []];
  state.selectedCard = {
    card: card(1),
    source: selectedSource,
    index: 0,
    discardPileIndex,
  };
  return state;
};

beforeEach(() => {
  vi.mocked(consumeDragCommitOverride).mockReturnValue(null);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('startPlayCardAnimation', () => {
  it('returns 0 and fires nothing when no card is selected', () => {
    const driver = makeDriver();
    const state = baseState('hand');
    state.selectedCard = null;

    expect(startPlayCardAnimation(state, 0, null, driver)).toEqual({
      playAnimationDuration: 0,
      completionAnimationDuration: 0,
    });
    expect(driver.startAnimation).not.toHaveBeenCalled();
  });

  it('returns 0 and fires nothing when the board is not in the DOM', () => {
    const driver = makeDriver();

    expect(startPlayCardAnimation(baseState('hand'), 0, null, driver).playAnimationDuration).toBe(0);
    expect(driver.startAnimation).not.toHaveBeenCalled();
  });

  it('fires a hand-source play animation from the rendered card position', () => {
    mountAnimationDom();
    const driver = makeDriver();

    const { playAnimationDuration } = startPlayCardAnimation(baseState('hand'), 0, null, driver);

    expect(playAnimationDuration).toBeGreaterThan(0);
    expect(driver.startAnimation).toHaveBeenCalledTimes(1);
    const animation = firstAnimationArg(driver.startAnimation);
    expect(animation.animationType).toBe('play');
    expect(animation.startAngleDeg).toBeDefined();
    expect(animation.startPosition).toBeDefined();
    expect(animation.targetPileLength).toBe(1);
  });

  it('fires a stock-source play animation', () => {
    mountAnimationDom();
    const driver = makeDriver();

    startPlayCardAnimation(baseState('stock'), 0, null, driver);

    expect(driver.startAnimation).toHaveBeenCalledTimes(1);
    expect(firstAnimationArg(driver.startAnimation).sourceInfo.source).toBe('stock');
  });

  it('fires a discard-source play animation', () => {
    mountAnimationDom();
    const driver = makeDriver();

    startPlayCardAnimation(baseState('discard', 0), 0, null, driver);

    expect(driver.startAnimation).toHaveBeenCalledTimes(1);
    expect(firstAnimationArg(driver.startAnimation).sourceInfo.source).toBe('discard');
  });

  it('honors a drag-commit override and drops the start angle', () => {
    mountAnimationDom();
    vi.mocked(consumeDragCommitOverride).mockReturnValue({ startPosition: { x: 11, y: 22 } });
    const driver = makeDriver();

    startPlayCardAnimation(baseState('hand'), 0, null, driver);

    const animation = firstAnimationArg(driver.startAnimation);
    expect(animation.startPosition).toEqual({ x: 11, y: 22 });
    expect(animation.startAngleDeg).toBeUndefined();
  });

  it('continues with game logic when the play animation itself throws', () => {
    mountAnimationDom();
    const driver = makeDriver();
    driver.startAnimation.mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => startPlayCardAnimation(baseState('hand'), 0, null, driver)).not.toThrow();
    expect(warn).toHaveBeenCalledWith('Play animation failed, continuing with game logic:', expect.any(Error));
  });

  it('continues with game logic when the completion animation throws', () => {
    mountAnimationDom();
    const driver = makeDriver();
    driver.animateCompletion.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { completionAnimationDuration } = startPlayCardAnimation(
      baseState('hand'),
      0,
      [card(1), card(2), card(3)],
      driver,
    );

    expect(completionAnimationDuration).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      'Completed build pile animation failed, continuing with game logic:',
      expect.any(Error),
    );
  });

  it('reports a settled pile length of 0 and fires completion when the play completes a pile', () => {
    mountAnimationDom();
    const driver = makeDriver();
    const completed: Card[] = [card(1), card(2), card(3)];

    startPlayCardAnimation(baseState('hand'), 0, completed, driver);

    expect(firstAnimationArg(driver.startAnimation).targetPileLength).toBe(0);
    expect(driver.animateCompletion).toHaveBeenCalledTimes(1);
  });
});

describe('startDiscardCardAnimation', () => {
  it('returns 0 and fires nothing when no card is selected', () => {
    const driver = makeDriver();
    const state = baseState('hand');
    state.selectedCard = null;

    expect(startDiscardCardAnimation(state, 1, driver)).toBe(0);
    expect(driver.startAnimation).not.toHaveBeenCalled();
  });

  it('returns 0 when the board is not in the DOM', () => {
    const driver = makeDriver();

    expect(startDiscardCardAnimation(baseState('hand'), 1, driver)).toBe(0);
    expect(driver.startAnimation).not.toHaveBeenCalled();
  });

  it('fires a discard animation and returns its duration', () => {
    mountAnimationDom();
    const driver = makeDriver();

    const duration = startDiscardCardAnimation(baseState('hand'), 1, driver);

    expect(duration).toBeGreaterThan(0);
    expect(driver.startAnimation).toHaveBeenCalledTimes(1);
    const animation = firstAnimationArg(driver.startAnimation);
    expect(animation.animationType).toBe('discard');
    expect(animation.startAngleDeg).toBeDefined();
    expect(animation.targetInfo?.index).toBe(1);
  });

  it('honors a drag-commit override and drops the start angle', () => {
    mountAnimationDom();
    vi.mocked(consumeDragCommitOverride).mockReturnValue({ startPosition: { x: 7, y: 8 } });
    const driver = makeDriver();

    startDiscardCardAnimation(baseState('hand'), 1, driver);

    const animation = firstAnimationArg(driver.startAnimation);
    expect(animation.startPosition).toEqual({ x: 7, y: 8 });
    expect(animation.startAngleDeg).toBeUndefined();
  });

  it('continues with game logic when the discard animation throws', () => {
    mountAnimationDom();
    const driver = makeDriver();
    driver.startAnimation.mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => startDiscardCardAnimation(baseState('hand'), 1, driver)).not.toThrow();
    expect(warn).toHaveBeenCalledWith('Discard animation failed, continuing with game logic:', expect.any(Error));
  });
});
