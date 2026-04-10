import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gameReducer, initialGameState, type Card, type GameState } from '@skipbo/game-core';
import { serializeClientGameView, type ClientGameView, type CreateRoomResponse, type ServerMessage } from '@skipbo/multiplayer-protocol';

import { useOnlineSkipBoGame } from '@/hooks/useOnlineSkipBoGame';

const {
  calculateMultipleDrawAnimationDuration,
  removeAnimation,
  startAnimation,
  triggerMultipleDrawAnimations,
  waitForAnimations,
} = vi.hoisted(() => ({
  calculateMultipleDrawAnimationDuration: vi.fn(() => 0),
  removeAnimation: vi.fn(),
  startAnimation: vi.fn(),
  triggerMultipleDrawAnimations: vi.fn(async () => 0),
  waitForAnimations: vi.fn(async () => undefined),
}));

vi.mock('@/contexts/useCardAnimation', () => ({
  useCardAnimation: () => ({
    removeAnimation,
    startAnimation,
    waitForAnimations,
  }),
}));

vi.mock('@/services/drawAnimationService', () => ({
  calculateMultipleDrawAnimationDuration,
  setGlobalDrawAnimationContext: vi.fn(),
  triggerMultipleDrawAnimations,
}));

vi.mock('@/services/completedBuildPileAnimationService', () => ({
  setGlobalCompletedPileAnimationContext: vi.fn(),
  triggerCompletedBuildPileAnimation: vi.fn(() => 0),
}));

vi.mock('@/services/aiAnimationService', () => ({
  setGlobalAnimationContext: vi.fn(),
  triggerAIAnimation: vi.fn(async () => 0),
}));

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const createOnlineView = (
  gameState: GameState,
  version: number,
): ClientGameView =>
  serializeClientGameView({
    connectedSeats: [0, 1],
    expiresAt: '2026-04-05T12:00:00.000Z',
    gameState,
    roomCode: 'ABCDE',
    status: 'ACTIVE',
    version,
    viewerSeatIndex: 0,
  });

const createSelectedLastCardState = (): GameState => {
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

const mountOnlineAnimationDom = (): void => {
  const firstPlayerArea = document.createElement('div');
  firstPlayerArea.className = 'player-area';

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';

  const stockPile = document.createElement('div');
  stockPile.className = 'stock-pile';
  setElementRect(stockPile, createRect(40, 100, 80, 120));

  const stockCard = document.createElement('div');
  stockCard.className = 'card';
  setElementRect(stockCard, createRect(40, 100, 80, 120));
  stockPile.appendChild(stockCard);
  activePlayerArea.appendChild(stockPile);

  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));

  const buildPile = document.createElement('div');
  buildPile.setAttribute('data-build-pile', '0');
  setElementRect(buildPile, createRect(420, 120, 80, 120));
  centerArea.appendChild(buildPile);

  document.body.append(firstPlayerArea, activePlayerArea, centerArea);
};

const mountOnlineHandAnimationDom = (): void => {
  const firstPlayerArea = document.createElement('div');
  firstPlayerArea.className = 'player-area';

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';

  const handArea = document.createElement('div');
  handArea.className = 'hand-area';
  setElementRect(handArea, createRect(120, 420, 360, 120));
  handArea.style.setProperty('--card-width', '80px');
  handArea.style.setProperty('--card-height', '120px');

  const cardHolder = document.createElement('div');
  cardHolder.setAttribute('data-card-index', '0');

  const selectedCard = document.createElement('div');
  selectedCard.className = 'card selected';
  setElementRect(selectedCard, createRect(160, 412, 80, 120));

  cardHolder.appendChild(selectedCard);
  handArea.appendChild(cardHolder);
  activePlayerArea.appendChild(handArea);

  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));

  const buildPile = document.createElement('div');
  buildPile.setAttribute('data-build-pile', '0');
  setElementRect(buildPile, createRect(420, 120, 80, 120));
  centerArea.appendChild(buildPile);

  document.body.append(firstPlayerArea, activePlayerArea, centerArea);
};

const mountOnlineDiscardAnimationDom = (): void => {
  const firstPlayerArea = document.createElement('div');
  firstPlayerArea.className = 'player-area';

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';

  const discardPiles = document.createElement('div');
  discardPiles.className = 'discard-piles';

  const emptyPile = document.createElement('div');
  emptyPile.setAttribute('data-pile-index', '0');
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
  discardPiles.appendChild(targetPile);
  activePlayerArea.appendChild(discardPiles);

  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));

  const buildPile = document.createElement('div');
  buildPile.setAttribute('data-build-pile', '0');
  setElementRect(buildPile, createRect(420, 120, 80, 120));
  centerArea.appendChild(buildPile);

  document.body.append(firstPlayerArea, activePlayerArea, centerArea);
};

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly sent: string[] = [];
  readonly listeners = new Map<string, Array<(event?: unknown) => void>>();
  readyState = MockWebSocket.CONNECTING;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event?: unknown) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }

  send(data: string): void {
    this.sent.push(data);
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open');
  }

  emitMessage(message: ServerMessage): void {
    this.emit('message', { data: JSON.stringify(message) });
  }

  private emit(type: string, event?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('useOnlineSkipBoGame', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    document.body.innerHTML = '';
    removeAnimation.mockClear();
    startAnimation.mockClear();
    triggerMultipleDrawAnimations.mockClear();
    calculateMultipleDrawAnimationDuration.mockClear();
    waitForAnimations.mockClear();
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
  });

  it('waits for the authoritative snapshot before animating a hand refill online', async () => {
    const session: CreateRoomResponse = {
      expiresAt: '2026-04-05T12:00:00.000Z',
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
      wsUrl: 'ws://example.test/game',
    };

    const initialState = createSelectedLastCardState();
    const nextState = gameReducer(initialState, { type: 'PLAY_CARD', buildPile: 0 });
    const initialView = createOnlineView(initialState, 1);
    const nextView = createOnlineView(nextState, 2);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'snapshot', view: initialView });
      await Promise.resolve();
    });

    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.gameState.selectedCard?.card.value).toBe(1);

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
      await Promise.resolve();
    });

    expect(result.current.gameState.players[0].hand).toEqual([null, null, null, null, null]);

    expect(triggerMultipleDrawAnimations).not.toHaveBeenCalled();

    const playMessage = JSON.parse(socket.sent.at(-1) ?? '{}');
    expect(playMessage).toMatchObject({
      type: 'action',
      action: { type: 'PLAY_CARD', buildPile: 0 },
    });

    await act(async () => {
      socket.emitMessage({ type: 'snapshot', view: nextView });
      await Promise.resolve();
    });

    expect(triggerMultipleDrawAnimations).toHaveBeenCalledTimes(1);

    const [playerIndex, refillCards, handIndices] =
      triggerMultipleDrawAnimations.mock.calls[0] as unknown as [number, Card[], number[]];
    expect(playerIndex).toBe(0);
    expect(refillCards).toEqual([
      card(8),
      card(9),
      card(10),
      card(11),
      card(12),
    ]);
    expect(handIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it('lifts stock-source play animations so the next stock card is visible immediately online', async () => {
    const session: CreateRoomResponse = {
      expiresAt: '2026-04-05T12:00:00.000Z',
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
      wsUrl: 'ws://example.test/game',
    };

    mountOnlineAnimationDom();

    const initialState = createSelectedStockCardState();
    const initialView = createOnlineView(initialState, 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'snapshot', view: initialView });
      await Promise.resolve();
    });

    expect(result.current.gameState.players[0].stockPile[0]).toEqual(card(9));

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
      await Promise.resolve();
    });

    expect(startAnimation).toHaveBeenCalledTimes(1);

    const animation = startAnimation.mock.calls[0]?.[0];
    expect(animation.startPosition).toEqual({
      x: 80,
      y: 160,
    });
    expect(animation.endPosition).toEqual({
      x: 460,
      y: 180,
    });
  });

  it('starts discard-source play animations from the top discard card online', async () => {
    const session: CreateRoomResponse = {
      expiresAt: '2026-04-05T12:00:00.000Z',
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
      wsUrl: 'ws://example.test/game',
    };

    mountOnlineDiscardAnimationDom();

    const initialState = createSelectedDiscardCardState();
    const initialView = createOnlineView(initialState, 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'snapshot', view: initialView });
      await Promise.resolve();
    });

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
      await Promise.resolve();
    });

    expect(startAnimation).toHaveBeenCalledTimes(1);

    const animation = startAnimation.mock.calls[0]?.[0];
    expect(animation.startPosition).toEqual({
      x: 200,
      y: 180,
    });
    expect(animation.endPosition).toEqual({
      x: 460,
      y: 180,
    });
  });

  it('starts hand-source play animations from the selected card rendered position online', async () => {
    const session: CreateRoomResponse = {
      expiresAt: '2026-04-05T12:00:00.000Z',
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
      wsUrl: 'ws://example.test/game',
    };

    mountOnlineHandAnimationDom();

    const initialState = createSelectedLastCardState();
    const initialView = createOnlineView(initialState, 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'snapshot', view: initialView });
      await Promise.resolve();
    });

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
      await Promise.resolve();
    });

    expect(startAnimation).toHaveBeenCalledTimes(1);

    const animation = startAnimation.mock.calls[0]?.[0];
    expect(animation.startPosition).toEqual({
      x: 200,
      y: 472,
    });
    expect(animation.endPosition).toEqual({
      x: 460,
      y: 180,
    });
  });
});
