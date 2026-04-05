import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gameReducer, initialGameState, type Card, type GameState } from '@skipbo/game-core';
import { serializeClientGameView, type ClientGameView, type CreateRoomResponse, type ServerMessage } from '@skipbo/multiplayer-protocol';

import { useOnlineSkipBoGame } from '@/hooks/useOnlineSkipBoGame';

const {
  calculateMultipleDrawAnimationDuration,
  triggerMultipleDrawAnimations,
} = vi.hoisted(() => ({
  calculateMultipleDrawAnimationDuration: vi.fn(() => 0),
  triggerMultipleDrawAnimations: vi.fn(async () => 0),
}));

vi.mock('@/contexts/useCardAnimation', () => ({
  useCardAnimation: () => ({
    removeAnimation: vi.fn(),
    startAnimation: vi.fn(),
    waitForAnimations: vi.fn(async () => undefined),
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
    triggerMultipleDrawAnimations.mockClear();
    calculateMultipleDrawAnimationDuration.mockClear();
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
});
