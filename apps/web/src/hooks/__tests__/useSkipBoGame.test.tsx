import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Card, type GameState, initialGameState } from '@skipbo/game-core';

import { useSkipBoGame } from '@/hooks/useSkipBoGame';

const {
  activeAnimationsState,
  removeAnimation,
  send,
  startAnimation,
  triggerCompletedBuildPileAnimation,
  triggerMultipleDrawAnimations,
  useMachineMock,
  waitForAnimations,
  workingState,
} = vi.hoisted(() => {
  const activeAnimationsState = {
    current: [] as Array<Record<string, unknown>>,
  };
  const removeAnimation = vi.fn();
  const send = vi.fn();
  const startAnimation = vi.fn();
  const triggerCompletedBuildPileAnimation = vi.fn(() => 0);
  const triggerMultipleDrawAnimations = vi.fn(async () => 0);
  const waitForAnimations = vi.fn(async () => undefined);
  const workingState = {
    current: null as GameState | null,
  };
  const actorRef = {
    getSnapshot: () => ({ context: { G: workingState.current } }),
  };
  const useMachineMock = vi.fn(() => [{ context: { G: workingState.current } }, send, actorRef] as const);

  return {
    activeAnimationsState,
    removeAnimation,
    send,
    startAnimation,
    triggerCompletedBuildPileAnimation,
    triggerMultipleDrawAnimations,
    useMachineMock,
    waitForAnimations,
    workingState,
  };
});

vi.mock('@xstate/react', () => ({
  useMachine: useMachineMock,
}));

vi.mock('@/contexts/useCardAnimation', () => ({
  useCardAnimation: () => ({
    activeAnimations: activeAnimationsState.current,
    removeAnimation,
    startAnimation,
    waitForAnimations,
  }),
}));

vi.mock('@/services/aiAnimationService', () => ({
  setGlobalAnimationContext: vi.fn(),
}));

vi.mock('@/services/drawAnimationService', () => ({
  calculateMultipleDrawAnimationDuration: vi.fn(() => 0),
  setGlobalDrawAnimationContext: vi.fn(),
  triggerMultipleDrawAnimations,
}));

vi.mock('@/services/completedBuildPileAnimationService', () => ({
  setGlobalCompletedPileAnimationContext: vi.fn(),
  triggerCompletedBuildPileAnimation,
}));

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const createSelectedHandCardState = (): GameState => {
  const state = initialGameState();

  state.currentPlayerIndex = 0;
  state.buildPiles = [[], [], [], []];
  state.completedBuildPiles = [];
  state.deck = [card(8), card(9), card(10), card(11), card(12)];
  state.players[0].hand = [card(1), null, null, null, null];
  state.players[1].isAI = false;
  state.selectedCard = {
    card: card(1),
    source: 'hand',
    index: 0,
  };
  state.message = 'Sélectionnez une destination';

  return state;
};

const createCompletingHandCardState = (): GameState => {
  const state = initialGameState();
  const max = state.config.CARD_VALUES_MAX;

  state.currentPlayerIndex = 0;
  // Build pile 0 holds 1..(max-1); playing the max card completes it.
  state.buildPiles = [Array.from({ length: max - 1 }, (_, i) => card(i + 1)), [], [], []];
  state.completedBuildPiles = [];
  state.deck = [card(8), card(9), card(10), card(11), card(12)];
  state.players[0].hand = [card(max), null, null, null, null];
  state.players[1].isAI = false;
  state.selectedCard = {
    card: card(max),
    source: 'hand',
    index: 0,
  };
  state.message = 'Sélectionnez une destination';

  return state;
};

const createSelectedStockCardState = (): GameState => {
  const state = initialGameState();

  state.currentPlayerIndex = 0;
  state.buildPiles = [[], [], [], []];
  state.completedBuildPiles = [];
  state.players[0].stockPile = [card(9), card(1)];
  state.players[1].isAI = false;
  state.selectedCard = {
    card: card(1),
    source: 'stock',
    index: 1,
  };
  state.message = 'Sélectionnez une destination';

  return state;
};

const createSelectedDiscardCardState = (): GameState => {
  const state = initialGameState();

  state.currentPlayerIndex = 0;
  state.buildPiles = [[card(1), card(2), card(3), card(4), card(5)], [], [], []];
  state.completedBuildPiles = [];
  state.players[0].discardPiles = [[], [card(12), card(6)], [], []];
  state.players[1].isAI = false;
  state.selectedCard = {
    card: card(6),
    source: 'discard',
    index: 1,
    discardPileIndex: 1,
  };
  state.message = 'Sélectionnez une destination';

  return state;
};

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
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
};

const appendPlayerAreas = (): HTMLElement => {
  const firstPlayerArea = document.createElement('div');
  firstPlayerArea.className = 'player-area';
  firstPlayerArea.setAttribute('data-player-index', '1');

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';
  activePlayerArea.setAttribute('data-player-index', '0');

  document.body.append(firstPlayerArea, activePlayerArea);

  return activePlayerArea;
};

const appendCenterArea = (): void => {
  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));

  const buildPile = document.createElement('div');
  buildPile.setAttribute('data-build-pile', '0');
  setElementRect(buildPile, createRect(420, 120, 80, 120));
  centerArea.appendChild(buildPile);

  document.body.append(centerArea);
};

const appendHandArea = (): void => {
  const activePlayerArea = appendPlayerAreas();
  const handArea = document.createElement('div');
  handArea.className = 'hand-area';
  setElementRect(handArea, createRect(120, 420, 360, 120));
  handArea.style.setProperty('--card-width', '80px');
  handArea.style.setProperty('--card-height', '120px');

  const cardHolder = document.createElement('div');
  cardHolder.setAttribute('data-card-index', '0');
  cardHolder.style.setProperty('--card-rotate', '0deg');

  const selectedCard = document.createElement('div');
  selectedCard.className = 'card selected';
  setElementRect(selectedCard, createRect(160, 412, 80, 120));

  cardHolder.appendChild(selectedCard);
  handArea.appendChild(cardHolder);
  activePlayerArea.appendChild(handArea);
  appendCenterArea();
};

const appendStockArea = (): void => {
  const activePlayerArea = appendPlayerAreas();
  const stockPile = document.createElement('div');
  stockPile.className = 'stock-pile';
  setElementRect(stockPile, createRect(40, 100, 80, 120));

  const stockCard = document.createElement('div');
  stockCard.className = 'card';
  setElementRect(stockCard, createRect(40, 100, 80, 120));
  stockPile.appendChild(stockCard);
  activePlayerArea.appendChild(stockPile);
  appendCenterArea();
};

const appendDiscardArea = (): void => {
  const activePlayerArea = appendPlayerAreas();
  const discardPiles = document.createElement('div');
  discardPiles.className = 'discard-piles';

  const emptyPile = document.createElement('div');
  emptyPile.setAttribute('data-pile-index', '0');
  setElementRect(emptyPile, createRect(80, 100, 80, 120));
  discardPiles.appendChild(emptyPile);

  const targetPile = document.createElement('div');
  targetPile.setAttribute('data-pile-index', '1');
  targetPile.style.setProperty('--stack-diff', '20px');
  setElementRect(targetPile, createRect(160, 100, 80, 140));

  const bottomCard = document.createElement('div');
  bottomCard.className = 'card';
  setElementRect(bottomCard, createRect(160, 100, 80, 120));

  const topCard = document.createElement('div');
  topCard.className = 'card';
  setElementRect(topCard, createRect(160, 120, 80, 120));

  targetPile.append(bottomCard, topCard);
  discardPiles.append(emptyPile, targetPile);
  activePlayerArea.appendChild(discardPiles);
  appendCenterArea();
};

const appendHandAndDiscardArea = (): void => {
  const activePlayerArea = appendPlayerAreas();
  const handArea = document.createElement('div');
  handArea.className = 'hand-area';
  setElementRect(handArea, createRect(120, 420, 360, 120));
  handArea.style.setProperty('--card-width', '80px');
  handArea.style.setProperty('--card-height', '120px');

  const cardHolder = document.createElement('div');
  cardHolder.setAttribute('data-card-index', '0');
  cardHolder.style.setProperty('--card-rotate', '0deg');

  const selectedCard = document.createElement('div');
  selectedCard.className = 'card selected';
  setElementRect(selectedCard, createRect(160, 412, 80, 120));

  cardHolder.appendChild(selectedCard);
  handArea.appendChild(cardHolder);
  activePlayerArea.appendChild(handArea);

  const discardPiles = document.createElement('div');
  discardPiles.className = 'discard-piles';

  const firstPile = document.createElement('div');
  firstPile.setAttribute('data-pile-index', '0');
  setElementRect(firstPile, createRect(160, 100, 80, 120));

  const secondPile = document.createElement('div');
  secondPile.setAttribute('data-pile-index', '1');
  setElementRect(secondPile, createRect(260, 100, 80, 120));

  discardPiles.append(firstPile, secondPile);
  activePlayerArea.appendChild(discardPiles);
};

describe('useSkipBoGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    activeAnimationsState.current = [];
    send.mockClear();
    startAnimation.mockClear();
    removeAnimation.mockClear();
    triggerCompletedBuildPileAnimation.mockClear();
    triggerMultipleDrawAnimations.mockClear();
    waitForAnimations.mockClear();
    useMachineMock.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it.each([
    {
      buildPile: 0,
      mountDom: appendHandArea,
      name: 'hand-source plays',
      stateFactory: createSelectedHandCardState,
    },
    {
      buildPile: 0,
      mountDom: appendStockArea,
      name: 'stock-source plays',
      stateFactory: createSelectedStockCardState,
    },
    {
      buildPile: 0,
      mountDom: appendDiscardArea,
      name: 'discard-source plays',
      stateFactory: createSelectedDiscardCardState,
    },
  ])(
    'accepts new selections while $name are still animating locally',
    async ({ buildPile, mountDom, stateFactory }) => {
      workingState.current = stateFactory();
      mountDom();

      const { result } = renderHook(() => useSkipBoGame());
      const playPromise = result.current.playCard(buildPile);

      await act(async () => {
        const moveResult = await playPromise;
        expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
      });

      // PLAY_CARD has been dispatched immediately; the animation runs in
      // parallel. The user can already queue a new selection.
      act(() => {
        result.current.selectCard('stock', workingState.current!.players[0].stockPile.length - 1);
      });

      expect(send.mock.calls).toEqual([
        [{ type: 'PLAY_CARD', buildPile: 0, animationDuration: 0 }],
        [
          {
            type: 'SELECT_CARD',
            source: 'stock',
            index: workingState.current!.players[0].stockPile.length - 1,
            discardPileIndex: undefined,
          },
        ],
      ]);
    },
  );

  it('rejects a play when no card is selected, without dispatching', async () => {
    const state = createSelectedHandCardState();
    state.selectedCard = null;
    workingState.current = state;
    appendHandArea();

    const { result } = renderHook(() => useSkipBoGame());

    await act(async () => {
      expect(await result.current.playCard(0)).toEqual({ success: false, message: 'Aucune carte sélectionnée' });
    });

    expect(send).not.toHaveBeenCalled();
    expect(startAnimation).not.toHaveBeenCalled();
  });

  it('rejects an illegal play with the shared error message, without dispatching', async () => {
    const state = createSelectedHandCardState();
    state.selectedCard = { card: card(7), source: 'hand', index: 0 };
    state.players[0].hand = [card(7), null, null, null, null];
    workingState.current = state;
    appendHandArea();

    const { result } = renderHook(() => useSkipBoGame());

    await act(async () => {
      expect(await result.current.playCard(0)).toEqual({
        success: false,
        message: 'Vous ne pouvez pas jouer cette carte',
      });
    });

    expect(send).not.toHaveBeenCalled();
  });

  it('rejects discarding a non-hand selection, without dispatching', async () => {
    workingState.current = createSelectedStockCardState();
    appendHandAndDiscardArea();

    const { result } = renderHook(() => useSkipBoGame());

    await act(async () => {
      expect(await result.current.discardCard(0)).toEqual({
        success: false,
        message: 'Vous devez défausser une carte de votre main',
      });
    });

    expect(send).not.toHaveBeenCalled();
  });

  it('reports the cleared pile length (0) for a play that completes a build pile', async () => {
    workingState.current = createCompletingHandCardState();
    appendHandArea();

    const { result } = renderHook(() => useSkipBoGame());

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
    });

    // The committed state clears the build pile, so the in-flight play card must
    // advertise targetPileLength 0. This lets CenterArea keep the pre-completion
    // backdrop until the play animation lands, instead of painting the final
    // card on the pile before it has visually arrived.
    expect(startAnimation).toHaveBeenCalledTimes(1);
    expect(startAnimation.mock.calls[0][0]).toMatchObject({
      animationType: 'play',
      targetSettledInState: true,
      targetPileLength: 0,
    });
  });

  it('accepts new selections while a discard is still animating locally', async () => {
    workingState.current = createSelectedHandCardState();
    appendHandAndDiscardArea();

    const { result } = renderHook(() => useSkipBoGame());
    const discardPromise = result.current.discardCard(1);

    await act(async () => {
      const moveResult = await discardPromise;
      expect(moveResult).toEqual({ success: true, message: 'Carte défaussée' });
    });

    // The discard ends the human turn (currentPlayerIndex flips), but we still
    // dispatched SELECT_CARD locally — the xstate guard will be the one that
    // prevents stale actions. Here we only assert that the lock no longer
    // swallows selections during the animation.
    act(() => {
      result.current.selectCard('stock', workingState.current!.players[0].stockPile.length - 1);
    });

    expect(send.mock.calls).toEqual([
      [{ type: 'DISCARD_CARD', discardPile: 1, animationDuration: expect.any(Number) }],
      [
        {
          type: 'SELECT_CARD',
          source: 'stock',
          index: workingState.current!.players[0].stockPile.length - 1,
          discardPileIndex: undefined,
        },
      ],
    ]);
  });
});
