import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gameReducer, initialGameState, type Card, type GameState } from '@skipbo/game-core';
import type { CreateRoomResponse, LobbySeatInfo, RoomSummary, ServerMessage } from '@klbsjpolp/realtime-core';
import { serializeClientGameView, type ClientGameView } from '@skipbo/skipbo-runtime';

import { inferOpponentTransition, useOnlineSkipBoGame } from '@/hooks/useOnlineSkipBoGame';
import { WEBSOCKET_PING_INTERVAL_MS } from '@/config/timing';
import type { GameStatsRecord } from '@/monitoring/gameStats';

const {
  activeAnimationsState,
  calculateMultipleDrawAnimationDuration,
  removeAnimation,
  startAnimation,
  triggerAIAnimation,
  triggerCompletedBuildPileAnimation,
  triggerMultipleDrawAnimations,
  waitForAnimations,
} = vi.hoisted(() => ({
  activeAnimationsState: {
    current: [] as Array<Record<string, unknown>>,
  },
  calculateMultipleDrawAnimationDuration: vi.fn(() => 0),
  removeAnimation: vi.fn(),
  startAnimation: vi.fn(),
  triggerAIAnimation: vi.fn(() => 0),
  triggerCompletedBuildPileAnimation: vi.fn(() => 0),
  triggerMultipleDrawAnimations: vi.fn(async () => 0),
  waitForAnimations: vi.fn(async () => undefined),
}));

vi.mock('@/contexts/useCardAnimation', () => ({
  useCardAnimation: () => ({
    activeAnimations: activeAnimationsState.current,
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
  triggerCompletedBuildPileAnimation,
}));

vi.mock('@/services/aiAnimationService', () => ({
  setGlobalAnimationContext: vi.fn(),
  triggerAIAnimation,
}));

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const createOnlineView = (gameState: GameState, version: number): ClientGameView =>
  serializeClientGameView({
    connectedSeats: gameState.players.map((_, index) => index),
    expiresAt: '2026-04-05T12:00:00.000Z',
    gameState,
    roomCode: 'ABC',
    status: 'ACTIVE',
    version,
    viewerSeatIndex: 0,
  });

const waitingRoomSummary = (connectedSeats: number[], version: number, lobbySeats?: LobbySeatInfo[]): RoomSummary => ({
  connectedSeats,
  currentSeatIndex: null,
  disconnectedSeats: [],
  expiresAt: '2026-04-05T12:00:00.000Z',
  hostSeatIndex: 0,
  lobbySeats:
    lobbySeats ?? connectedSeats.map((seatIndex) => ({ seatIndex, readyState: 'never-ready', displayName: null })),
  roomCode: 'ABC',
  seatCapacity: 4,
  status: 'WAITING',
  version,
});

// The local player is a GUEST (seat 1); the host (seat 0) relays redacted views.
const createSession = (): CreateRoomResponse => ({
  expiresAt: '2026-04-05T12:00:00.000Z',
  hostSeatIndex: 0,
  roomCode: 'ABC',
  seatCapacity: 4,
  seatIndex: 1,
  seatToken: 'seat-token',
  wsUrl: 'ws://example.test/game',
});

const createHostSession = (): CreateRoomResponse => ({ ...createSession(), seatIndex: 0 });

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

const createSelectedCompletingHandState = (): GameState => {
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

const createInteractiveOnlineState = (): GameState => {
  const state = initialGameState();

  state.currentPlayerIndex = 0;
  state.players[1].isAI = false;
  state.selectedCard = null;
  state.message = "C'est votre tour";

  return state;
};

const createOpponentDiscardHandoffStates = (): { previousState: GameState; nextState: GameState } => {
  const previousState = initialGameState({ playerCount: 3 });

  previousState.currentPlayerIndex = 1;
  previousState.deck = [card(1), card(2)];
  previousState.buildPiles = [[], [], [], []];
  previousState.completedBuildPiles = [];
  previousState.players[1].hand = [card(7), card(8), card(9), card(10), card(11)];
  previousState.players[2].hand = [null, null, card(4), card(5), card(6)];
  previousState.selectedCard = {
    card: card(7),
    source: 'hand',
    index: 0,
  };

  const afterDiscardState = gameReducer(previousState, {
    type: 'DISCARD_CARD',
    discardPile: 0,
  });
  const nextState = gameReducer(afterDiscardState, { type: 'DRAW' });

  return { previousState, nextState };
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

const mountOnlineAnimationDom = (): void => {
  const firstPlayerArea = document.createElement('div');
  firstPlayerArea.className = 'player-area';
  firstPlayerArea.dataset.playerIndex = '1';

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';
  activePlayerArea.dataset.playerIndex = '0';

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
  firstPlayerArea.dataset.playerIndex = '1';

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
  firstPlayerArea.dataset.playerIndex = '1';

  const activePlayerArea = document.createElement('div');
  activePlayerArea.className = 'player-area';
  activePlayerArea.dataset.playerIndex = '0';

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

// Hand-area (selected card at index 0) plus an empty discard pile 0, so a local
// discard produces a real, non-zero play animation duration.
const mountOnlineHandDiscardDom = (): void => {
  const firstPlayerArea = document.createElement('div');
  firstPlayerArea.className = 'player-area';
  firstPlayerArea.dataset.playerIndex = '1';

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

  const selectedCard = document.createElement('div');
  selectedCard.className = 'card selected';
  setElementRect(selectedCard, createRect(160, 412, 80, 120));

  cardHolder.appendChild(selectedCard);
  handArea.appendChild(cardHolder);
  activePlayerArea.appendChild(handArea);

  const discardPiles = document.createElement('div');
  discardPiles.className = 'discard-piles';

  const targetPile = document.createElement('div');
  targetPile.setAttribute('data-pile-index', '0');
  setElementRect(targetPile, createRect(600, 100, 80, 140));
  discardPiles.appendChild(targetPile);
  activePlayerArea.appendChild(discardPiles);

  document.body.append(firstPlayerArea, activePlayerArea);
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

  /** Convenience: deliver an authoritative view as the host would relay it. */
  emitView(view: ClientGameView): void {
    this.emitMessage({ type: 'relayed', fromSeat: 0, kind: 'view', payload: view });
  }

  private emit(type: string, event?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

interface RelayMessage {
  type: string;
  kind?: string;
  payload?: { type?: string };
}

const getMoveMessages = (socket: MockWebSocket): RelayMessage[] =>
  socket.sent
    .map((message) => JSON.parse(message) as RelayMessage)
    .filter((message) => message.type === 'relay' && message.kind === 'move');

describe('useOnlineSkipBoGame', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    document.body.innerHTML = '';
    activeAnimationsState.current = [];
    removeAnimation.mockClear();
    startAnimation.mockClear();
    triggerAIAnimation.mockClear();
    triggerAIAnimation.mockImplementation(() => 0);
    triggerCompletedBuildPileAnimation.mockClear();
    triggerCompletedBuildPileAnimation.mockImplementation(() => 0);
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

  it('waits for the authoritative view before animating a hand refill online', async () => {
    const session = createSession();

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
      socket.emitView(initialView);
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
      type: 'relay',
      kind: 'move',
      payload: { type: 'PLAY_CARD', buildPile: 0 },
    });

    await act(async () => {
      socket.emitView(nextView);
      await Promise.resolve();
    });

    expect(triggerMultipleDrawAnimations).toHaveBeenCalledTimes(1);

    const [playerIndex, refillCards, handIndices] = triggerMultipleDrawAnimations.mock.calls[0] as unknown as [
      number,
      Card[],
      number[],
    ];
    expect(playerIndex).toBe(0);
    expect(refillCards).toEqual([card(8), card(9), card(10), card(11), card(12)]);
    expect(handIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it('lifts stock-source play animations so the next stock card is visible immediately online', async () => {
    const session = createSession();

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
      socket.emitView(initialView);
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

  it('tags view-driven opponent build animations with the settled pile length', async () => {
    const session = createSession();

    const previousState = initialGameState();
    previousState.currentPlayerIndex = 1;
    previousState.buildPiles = [[card(1), card(0, true)], [], [], []];
    previousState.completedBuildPiles = [];
    previousState.players[1].hand = [card(3), null, null, null, null];
    previousState.selectedCard = {
      card: card(3),
      source: 'hand',
      index: 0,
    };
    previousState.message = 'Sélectionnez une destination';
    const nextState = gameReducer(previousState, { type: 'PLAY_CARD', buildPile: 0 });
    const previousView = createOnlineView(previousState, 1);
    const nextView = createOnlineView(nextState, 2);

    renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitView(previousView);
      await Promise.resolve();
    });

    await act(async () => {
      socket.emitView(nextView);
      await Promise.resolve();
    });

    expect(triggerAIAnimation).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'PLAY_CARD', buildPile: 0 },
      expect.objectContaining({
        targetPileLengthOverride: 3,
        targetSettledInStateOverride: true,
      }),
    );
  });

  it('starts discard-source play animations from the top discard card online', async () => {
    const session = createSession();

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
      socket.emitView(initialView);
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

  it('accepts new selections while a play is still animating online', async () => {
    const session = createSession();

    mountOnlineDiscardAnimationDom();

    const initialState = createSelectedDiscardCardState();
    initialState.players[0].hand = [card(9), null, null, null, null];
    const initialView = createOnlineView(initialState, 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitView(initialView);
      await Promise.resolve();
    });

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
    });

    act(() => {
      result.current.selectCard('hand', 0);
    });

    expect(result.current.gameState.selectedCard?.source).toBe('hand');
    expect(getMoveMessages(socket)).toContainEqual({
      type: 'relay',
      kind: 'move',
      payload: { type: 'PLAY_CARD', buildPile: 0 },
    });
    expect(getMoveMessages(socket)).toContainEqual({
      type: 'relay',
      kind: 'move',
      payload: {
        type: 'SELECT_CARD',
        source: 'hand',
        index: 0,
        discardPileIndex: undefined,
      },
    });
  });

  it('starts hand-source play animations from the selected card rendered position online', async () => {
    const session = createSession();

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
      socket.emitView(initialView);
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

  it('reports the cleared pile length (0) for a local play that completes a build pile online', async () => {
    const session = createSession();

    mountOnlineHandAnimationDom();

    const initialState = createSelectedCompletingHandState();
    const initialView = createOnlineView(initialState, 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitView(initialView);
      await Promise.resolve();
    });

    await act(async () => {
      const moveResult = await result.current.playCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte jouée' });
      await Promise.resolve();
    });

    // The committed view clears the build pile, so the in-flight play card must
    // advertise targetPileLength 0 — keeping CenterArea's pre-completion
    // backdrop until the play animation lands.
    expect(startAnimation).toHaveBeenCalledTimes(1);
    expect(startAnimation.mock.calls[0]?.[0]).toMatchObject({
      animationType: 'play',
      targetSettledInState: true,
      targetPileLength: 0,
    });
  });

  it('accepts new selections while view-driven animations are still active online', async () => {
    const session = createSession();

    activeAnimationsState.current = [
      {
        animationType: 'play',
        duration: 200,
        endPosition: { x: 0, y: 0 },
        id: 'active-animation',
        initialDelay: 0,
        sourceInfo: {
          index: 0,
          playerIndex: 0,
          source: 'hand',
        },
        sourceRevealed: true,
        startPosition: { x: 0, y: 0 },
        targetRevealed: true,
      },
    ];

    const initialView = createOnlineView(createInteractiveOnlineState(), 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitView(initialView);
      await Promise.resolve();
    });

    act(() => {
      result.current.selectCard('hand', 0);
    });

    expect(result.current.gameState.selectedCard?.source).toBe('hand');
    expect(getMoveMessages(socket)).toContainEqual({
      type: 'relay',
      kind: 'move',
      payload: {
        type: 'SELECT_CARD',
        source: 'hand',
        index: 0,
        discardPileIndex: undefined,
      },
    });
  });

  it('keeps the previous opponent message while a discard handoff animation is pending online', async () => {
    const session = createSession();
    const { previousState, nextState } = createOpponentDiscardHandoffStates();
    const previousView = createOnlineView(previousState, 1);
    const nextView = createOnlineView(nextState, 2);

    triggerAIAnimation.mockImplementationOnce(() => 200);
    calculateMultipleDrawAnimationDuration.mockReturnValueOnce(700);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitView(previousView);
      await Promise.resolve();
    });

    expect(result.current.gameState.message).toBe(previousView.message);

    await act(async () => {
      socket.emitView(nextView);
    });

    expect(triggerAIAnimation).toHaveBeenCalledTimes(1);
    expect(triggerMultipleDrawAnimations).toHaveBeenCalledTimes(1);
    expect(result.current.gameState.message).toBe(previousView.message);
    expect(result.current.gameState.currentPlayerIndex).toBe(previousView.currentPlayerIndex);

    await act(async () => {
      vi.advanceTimersByTime(699);
    });

    expect(result.current.gameState.message).toBe(previousView.message);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.gameState.message).toBe(nextView.message);
    expect(result.current.gameState.currentPlayerIndex).toBe(nextView.currentPlayerIndex);
  });

  it('holds the next player draw until the local discard animation finishes online', async () => {
    const session = createSession();

    mountOnlineHandDiscardDom();

    const initialState = initialGameState();
    initialState.currentPlayerIndex = 0;
    initialState.deck = [card(1), card(2), card(3), card(4)];
    initialState.buildPiles = [[], [], [], []];
    initialState.completedBuildPiles = [];
    initialState.players[0].hand = [card(6), null, null, null, null];
    initialState.players[1].isAI = false;
    initialState.players[1].hand = [null, null, card(4), card(5), card(6)];
    initialState.selectedCard = { card: card(6), source: 'hand', index: 0 };
    initialState.message = 'Sélectionnez une destination';

    // Authoritative result of the discard: the turn advances AND the next
    // player draws to refill their hand, all in one view.
    const nextState = gameReducer(gameReducer(initialState, { type: 'DISCARD_CARD', discardPile: 0 }), {
      type: 'DRAW',
    });

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
      socket.emitView(initialView);
      await Promise.resolve();
    });

    await act(async () => {
      const moveResult = await result.current.discardCard(0);
      expect(moveResult).toEqual({ success: true, message: 'Carte défaussée' });
      await Promise.resolve();
    });

    expect(startAnimation).toHaveBeenCalledTimes(1);
    const discardDuration = startAnimation.mock.calls[0]?.[0].duration as number;
    expect(discardDuration).toBeGreaterThan(0);

    await act(async () => {
      socket.emitView(nextView);
      await Promise.resolve();
    });

    // The next player's draw is scheduled with a base delay equal to the local
    // discard animation duration, instead of starting immediately (delay 0).
    expect(triggerMultipleDrawAnimations).toHaveBeenCalled();
    const drawCall = triggerMultipleDrawAnimations.mock.calls[0] as unknown as [
      number,
      Card[],
      number[],
      number,
      number,
    ];
    expect(drawCall[0]).toBe(1); // next player (opponent) is players[1]
    expect(drawCall[4]).toBe(discardDuration);
  });

  it('allows the host to start a waiting room as soon as all connected players are ready', async () => {
    const session = createHostSession();
    const allReadyLobbySeats: LobbySeatInfo[] = [
      { seatIndex: 0, readyState: 'ready', displayName: 'Alice' },
      { seatIndex: 1, readyState: 'ready', displayName: 'Bob' },
    ];

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0], 1) });
      await Promise.resolve();
    });

    expect(result.current.seatCapacity).toBe(4);
    expect(result.current.connectedSeats).toEqual([0]);
    expect(result.current.canStartGame).toBe(false);

    await act(async () => {
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0, 1], 2, allReadyLobbySeats) });
      await Promise.resolve();
    });

    expect(result.current.connectedSeats).toEqual([0, 1]);
    expect(result.current.canStartGame).toBe(true);

    act(() => {
      result.current.startGame();
    });

    expect(
      socket.sent.some((message) => {
        const parsed = JSON.parse(message) as { type: string; clientVersion?: number };

        return parsed.type === 'startGame' && parsed.clientVersion === 2;
      }),
    ).toBe(true);
  });

  it('sends the correct message for each lobby action', async () => {
    const session = createSession();
    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      await Promise.resolve();
    });

    act(() => {
      result.current.sendSetReady('Alice');
    });
    expect(JSON.parse(socket.sent.at(-1) ?? '{}')).toEqual({ type: 'setReady', playerName: 'Alice' });

    act(() => {
      result.current.sendSetReady();
    });
    expect(JSON.parse(socket.sent.at(-1) ?? '{}')).toMatchObject({ type: 'setReady' });

    act(() => {
      result.current.sendSetUnready();
    });
    expect(JSON.parse(socket.sent.at(-1) ?? '{}')).toEqual({ type: 'setUnready' });

    act(() => {
      result.current.kickSeat(2);
    });
    expect(JSON.parse(socket.sent.at(-1) ?? '{}')).toEqual({ type: 'kickSeat', targetSeatIndex: 2 });

    act(() => {
      result.current.leaveLobby();
    });
    expect(JSON.parse(socket.sent.at(-1) ?? '{}')).toEqual({ type: 'leaveLobby' });
  });

  it('does not reconnect after leaveLobby closes the socket', async () => {
    const session = createSession();
    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      await Promise.resolve();
    });

    act(() => {
      result.current.leaveLobby();
    });
    await act(async () => {
      socket.close();
      await Promise.resolve();
    });

    expect(MockWebSocket.instances.length).toBe(1);
  });

  // --- Connection lifecycle (host runtime, reconnect, ping, teardown) ---------

  const parseSent = (socket: MockWebSocket): Array<Record<string, unknown>> =>
    socket.sent.map((message) => JSON.parse(message) as Record<string, unknown>);

  it('builds the host runtime and relays views + a snapshot on gameStarted', async () => {
    const session = createHostSession();
    renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0, 1], 1) });
      socket.emitMessage({
        type: 'gameStarted',
        activeSeatIndices: [0, 1],
        currentSeatIndex: 0,
        gameConfig: { stockSize: 10 },
      });
      await Promise.resolve();
    });

    const sent = parseSent(socket);
    expect(sent.some((m) => m.type === 'relay' && m.kind === 'view' && (m.toSeats as number[])?.includes(1))).toBe(
      true,
    );
    expect(sent.some((m) => m.type === 'snapshot')).toBe(true);
  });

  it('restores the host runtime from a snapshot and re-relays views', async () => {
    const session = createHostSession();
    renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0, 1], 1) });
      socket.emitMessage({
        type: 'gameStarted',
        activeSeatIndices: [0, 1],
        currentSeatIndex: 0,
        gameConfig: { stockSize: 10 },
      });
      await Promise.resolve();
    });

    const snapshot = parseSent(socket).find((m) => m.type === 'snapshot');
    expect(snapshot).toBeDefined();
    const before = socket.sent.length;

    await act(async () => {
      socket.emitMessage({ type: 'snapshotRestore', payload: snapshot!.payload });
      await Promise.resolve();
    });

    const after = parseSent(socket).slice(before);
    expect(after.some((m) => m.type === 'relay' && m.kind === 'view' && (m.toSeats as number[])?.includes(1))).toBe(
      true,
    );
  });

  it('sends periodic pings while connected', async () => {
    const session = createSession();
    renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(WEBSOCKET_PING_INTERVAL_MS + 50);
    });

    expect(parseSent(socket).some((m) => m.type === 'ping')).toBe(true);
  });

  it('schedules a reconnect after an unexpected close', async () => {
    const session = createSession();
    renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      await Promise.resolve();
    });

    // An unexpected close (not via leaveLobby) should back off and reconnect.
    await act(async () => {
      socket.close();
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('tears down the live socket when the session becomes null', async () => {
    const { rerender } = renderHook((s: CreateRoomResponse | null) => useOnlineSkipBoGame(s), {
      initialProps: createSession() as CreateRoomResponse | null,
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      await Promise.resolve();
    });
    expect(socket.readyState).toBe(MockWebSocket.OPEN);

    await act(async () => {
      rerender(null);
      await Promise.resolve();
    });

    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('exposes lobbySeats and myReadyState from a waiting presence', async () => {
    const session = createSession();
    const lobbySeats: LobbySeatInfo[] = [
      { seatIndex: 0, readyState: 'ready', displayName: 'Alice' },
      { seatIndex: 1, readyState: 'ready', displayName: 'Bob' },
    ];

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0, 1], 1, lobbySeats) });
      await Promise.resolve();
    });

    expect(result.current.lobbySeats).toEqual(lobbySeats);
    // Local seat is 1 (guest), which is ready.
    expect(result.current.myReadyState).toBe('ready');
  });

  it('sets lobbyRemovalReason to host-left on roomClosed during WAITING', async () => {
    const session = createSession();

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0, 1], 1) });
      await Promise.resolve();
    });

    await act(async () => {
      socket.emitMessage({ type: 'roomClosed', status: 'WAITING', roomCode: 'ABC' });
      await Promise.resolve();
    });

    expect(result.current.lobbyRemovalReason).toBe('host-left');
  });

  it('sets lobbyRemovalReason to kicked on actionRejected during WAITING and prevents reconnect', async () => {
    const session = createSession();

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      socket.emitMessage({ type: 'presence', room: waitingRoomSummary([0, 1], 1) });
      await Promise.resolve();
    });

    await act(async () => {
      socket.emitMessage({ type: 'actionRejected', code: 'invalid_action', reason: 'Not authorized' });
      await Promise.resolve();
    });

    expect(result.current.lobbyRemovalReason).toBe('kicked');
    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
    expect(MockWebSocket.instances.length).toBe(1);
  });

  it('does not set lobbyRemovalReason on actionRejected during an ACTIVE game', async () => {
    const session = createSession();
    const activeView = createOnlineView(createInteractiveOnlineState(), 1);

    const { result } = renderHook(() => useOnlineSkipBoGame(session));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.open();
      socket.emitView(activeView);
      await Promise.resolve();
    });

    await act(async () => {
      socket.emitMessage({ type: 'actionRejected', code: 'invalid_action', reason: 'Invalid move' });
      await Promise.resolve();
    });

    expect(result.current.lobbyRemovalReason).toBeNull();
    expect(result.current.lastError).toBe('Invalid move');
  });

  describe('game stats broadcast', () => {
    const statsRecord: GameStatsRecord = {
      id: 'game-1',
      schemaVersion: 1,
      appVersion: 'vTEST',
      mode: 'online',
      startedAt: '2026-04-05T12:00:00.000Z',
      endedAt: '2026-04-05T12:10:00.000Z',
      durationMs: 600_000,
      totalTurns: 12,
      playerCount: 2,
      stockSize: 10,
      winnerIndex: 0,
      winnerName: 'Alice',
      winnerIsAI: false,
      players: [
        {
          index: 0,
          name: 'Alice',
          isAI: false,
          startStock: 10,
          leftoverStock: 0,
          cardsCleared: 10,
          turns: 6,
          playTimeMs: 300_000,
          isWinner: true,
        },
        {
          index: 1,
          name: 'Bob',
          isAI: false,
          startStock: 10,
          leftoverStock: 4,
          cardsCleared: 6,
          turns: 6,
          playTimeMs: 300_000,
          isWinner: false,
        },
      ],
    };

    it('broadcasts the host authoritative record as a relay event to every seat', async () => {
      const session = createHostSession();
      const { result } = renderHook(() => useOnlineSkipBoGame(session));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const socket = MockWebSocket.instances[0];
      await act(async () => {
        socket.open();
        await Promise.resolve();
      });

      act(() => {
        result.current.broadcastGameStats(statsRecord);
      });

      const sent = parseSent(socket);
      expect(sent).toContainEqual({
        type: 'relay',
        kind: 'event',
        payload: { gameStats: statsRecord },
        toSeats: undefined,
      });
    });

    it('stores the host authoritative record received as a relayed event (guest)', async () => {
      const session = createSession();
      const { result } = renderHook(() => useOnlineSkipBoGame(session));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const socket = MockWebSocket.instances[0];
      await act(async () => {
        socket.open();
        await Promise.resolve();
      });

      expect(result.current.receivedGameStats).toBeNull();

      await act(async () => {
        socket.emitMessage({ type: 'relayed', fromSeat: 0, kind: 'event', payload: { gameStats: statsRecord } });
        await Promise.resolve();
      });

      expect(result.current.receivedGameStats).toEqual(statsRecord);
    });

    it('resets the received record when a new game starts', async () => {
      const session = createSession();
      const { result } = renderHook(() => useOnlineSkipBoGame(session));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const socket = MockWebSocket.instances[0];
      await act(async () => {
        socket.open();
        socket.emitMessage({ type: 'relayed', fromSeat: 0, kind: 'event', payload: { gameStats: statsRecord } });
        await Promise.resolve();
      });

      expect(result.current.receivedGameStats).toEqual(statsRecord);

      await act(async () => {
        socket.emitMessage({
          type: 'gameStarted',
          activeSeatIndices: [0, 1],
          currentSeatIndex: 0,
          gameConfig: { stockSize: 10 },
        });
        await Promise.resolve();
      });

      expect(result.current.receivedGameStats).toBeNull();
    });
  });

  describe('opponent build pile completion (12)', () => {
    const createOpponentCompletionStates = (): { previousState: GameState; nextState: GameState } => {
      const previousState = initialGameState();
      previousState.currentPlayerIndex = 1;
      previousState.players[1].isAI = false;
      previousState.players[1].hand = [card(12), null, null, null, null];
      previousState.buildPiles = [
        [card(1), card(2), card(3), card(4), card(5), card(6), card(7), card(8), card(9), card(10), card(11)],
        [],
        [],
        [],
      ];
      previousState.completedBuildPiles = [];
      previousState.selectedCard = {
        card: card(12),
        source: 'hand',
        index: 0,
      };
      previousState.message = 'Sélectionnez une destination';

      const nextState = gameReducer(previousState, { type: 'PLAY_CARD', buildPile: 0 });

      return { previousState, nextState };
    };

    it('extracts completion metadata from the 12-on-11 view pair', () => {
      const { previousState, nextState } = createOpponentCompletionStates();

      expect(nextState.buildPiles[0]).toEqual([]);
      expect(nextState.completedBuildPiles).toHaveLength(12);

      const transition = inferOpponentTransition(previousState, nextState);

      expect(transition).not.toBeNull();
      expect(transition?.action).toEqual({ type: 'PLAY_CARD', buildPile: 0 });
      expect(transition?.animationCard.value).toBe(12);
      expect(transition?.completedBuildPileIndex).toBe(0);
      expect(transition?.completedCards).toHaveLength(12);
      expect(transition?.completedCards?.at(-1)?.value).toBe(12);
      expect(transition?.sourceRevealed).toBe(false);
      expect(transition?.targetPileLength).toBe(0);
    });

    it('returns null when neither buildPiles nor discardPiles changed', () => {
      const { previousState } = createOpponentCompletionStates();
      const unchanged: GameState = { ...previousState, selectedCard: null };

      expect(inferOpponentTransition(previousState, unchanged)).toBeNull();
    });

    it('schedules completion animation after the opponent play animation on a 12 view', async () => {
      const session = createSession();
      const { previousState, nextState } = createOpponentCompletionStates();
      const previousView = createOnlineView(previousState, 1);
      const nextView = createOnlineView(nextState, 2);

      const PLAY_DURATION = 320;
      triggerAIAnimation.mockImplementationOnce(() => PLAY_DURATION);

      renderHook(() => useOnlineSkipBoGame(session));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const socket = MockWebSocket.instances[0];
      expect(socket).toBeDefined();

      await act(async () => {
        socket.open();
        socket.emitView(previousView);
        await Promise.resolve();
      });

      await act(async () => {
        socket.emitView(nextView);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(triggerAIAnimation).toHaveBeenCalledTimes(1);
      expect(triggerAIAnimation).toHaveBeenCalledWith(
        expect.anything(),
        { type: 'PLAY_CARD', buildPile: 0 },
        expect.objectContaining({
          targetSettledInStateOverride: true,
          targetPileLengthOverride: 0,
        }),
      );

      expect(triggerCompletedBuildPileAnimation).toHaveBeenCalledTimes(1);
      const completionCall = triggerCompletedBuildPileAnimation.mock.calls[0] as unknown as [
        GameState,
        number,
        Card[],
        number,
        number,
        number,
      ];
      const [, completedBuildPileIndex, completedCards, initialCompletedCount, staggerDelay, baseDelay] =
        completionCall;

      expect(completedBuildPileIndex).toBe(0);
      expect(completedCards).toHaveLength(12);
      expect(completedCards.at(-1)?.value).toBe(12);
      expect(initialCompletedCount).toBe(0);
      expect(staggerDelay).toBe(100);
      expect(baseDelay).toBe(PLAY_DURATION);

      const playOrder = triggerAIAnimation.mock.invocationCallOrder[0];
      const completionOrder = triggerCompletedBuildPileAnimation.mock.invocationCallOrder[0];
      expect(playOrder).toBeLessThan(completionOrder);
    });

    it('registers play and completion animations in the same synchronous tick (no microtask gap)', async () => {
      const session = createSession();
      const { previousState, nextState } = createOpponentCompletionStates();
      const previousView = createOnlineView(previousState, 1);
      const nextView = createOnlineView(nextState, 2);

      triggerAIAnimation.mockImplementationOnce(() => 300);

      renderHook(() => useOnlineSkipBoGame(session));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const socket = MockWebSocket.instances[0];

      await act(async () => {
        socket.open();
        socket.emitView(previousView);
        await Promise.resolve();
      });

      await act(async () => {
        socket.emitView(nextView);
      });

      expect(triggerAIAnimation).toHaveBeenCalledTimes(1);
      expect(triggerCompletedBuildPileAnimation).toHaveBeenCalledTimes(1);
    });

    it('schedules opponent hand refill with baseDelay equal to the play animation duration', async () => {
      const previousState = initialGameState();
      previousState.currentPlayerIndex = 1;
      previousState.players[1].isAI = false;
      previousState.players[1].hand = [null, null, null, null, card(7)];
      previousState.deck = [card(2), card(3), card(4), card(5), card(8)];
      previousState.buildPiles = [[card(1), card(2), card(3), card(4), card(5), card(6)], [], [], []];
      previousState.selectedCard = {
        card: card(7),
        source: 'hand',
        index: 4,
      };
      previousState.message = 'Sélectionnez une destination';

      const nextState = gameReducer(previousState, { type: 'PLAY_CARD', buildPile: 0 });

      const session = createSession();
      const previousView = createOnlineView(previousState, 1);
      const nextView = createOnlineView(nextState, 2);

      const PLAY_DURATION = 280;
      triggerAIAnimation.mockImplementationOnce(() => PLAY_DURATION);

      renderHook(() => useOnlineSkipBoGame(session));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const socket = MockWebSocket.instances[0];

      await act(async () => {
        socket.open();
        socket.emitView(previousView);
        await Promise.resolve();
      });

      await act(async () => {
        socket.emitView(nextView);
      });

      expect(triggerMultipleDrawAnimations).toHaveBeenCalledTimes(1);
      const args = triggerMultipleDrawAnimations.mock.calls[0] as unknown as [number, Card[], number[], number, number];
      const [opponentIndex, , handIndices, , baseDelay] = args;
      expect(opponentIndex).toBe(1);
      expect(handIndices).toContain(4);
      expect(baseDelay).toBe(PLAY_DURATION);
    });
  });
});
