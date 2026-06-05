import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROTOCOL_VERSION } from '@skipbo/realtime-core';

import { ClientError } from '../../../errors/clientError.js';

// shared.ts instantiates real AWS clients from env at import time — stub it.
vi.mock('../../shared.js', () => ({
  broadcaster: { disconnect: vi.fn(), send: vi.fn() },
  connectionRepository: {},
  roomRepository: {},
  websocketUrl: 'wss://example.test/ws',
}));

// Keep withSentry a pass-through so we test the raw handler; spy on capture.
vi.mock('../../../monitoring/sentry.js', () => ({
  captureBackendException: vi.fn(),
  withSentry: <T>(handler: T): T => handler,
}));

vi.mock('../../../services/roomService.js', () => ({
  authenticateConnection: vi.fn(),
  handleEndGame: vi.fn(),
  handleKickSeat: vi.fn(),
  handleLeaveLobby: vi.fn(),
  handleRelay: vi.fn(),
  handleSetReady: vi.fn(),
  handleSetTurn: vi.fn(),
  handleSetUnready: vi.fn(),
  handleSnapshot: vi.fn(),
  rejectAction: vi.fn(),
  startGame: vi.fn(),
}));

import { handler } from '../message.js';
import { captureBackendException } from '../../../monitoring/sentry.js';
import * as roomService from '../../../services/roomService.js';

const makeEvent = (body: unknown, connectionId: string | undefined): APIGatewayProxyWebsocketEventV2 =>
  ({
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { connectionId, routeKey: '$default' },
  }) as unknown as APIGatewayProxyWebsocketEventV2;

const runHandler = (event: APIGatewayProxyWebsocketEventV2) =>
  handler(event, {} as never, () => undefined) as Promise<{ statusCode: number; body: string }>;

const invoke = (body: unknown, connectionId = 'conn-1') => runHandler(makeEvent(body, connectionId));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ws message handler', () => {
  it('returns 400 when the connection id is missing', async () => {
    const result = await runHandler(makeEvent({ type: 'ping' }, undefined));

    expect(result.statusCode).toBe(400);
    expect(roomService.authenticateConnection).not.toHaveBeenCalled();
  });

  it('routes auth to authenticateConnection', async () => {
    const result = await invoke({
      type: 'auth',
      protocolVersion: PROTOCOL_VERSION,
      roomCode: 'ABC',
      seatIndex: 0,
      seatToken: 'tok',
    });

    expect(result.statusCode).toBe(200);
    expect(roomService.authenticateConnection).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      protocolVersion: PROTOCOL_VERSION,
      roomCode: 'ABC',
      seatIndex: 0,
      seatToken: 'tok',
    });
  });

  it('routes relay with its opaque payload and targets', async () => {
    await invoke({ type: 'relay', kind: 'move', payload: { type: 'END_TURN' }, toSeats: [1] });

    expect(roomService.handleRelay).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      kind: 'move',
      payload: { type: 'END_TURN' },
      toSeats: [1],
    });
  });

  it('routes the host control messages', async () => {
    await invoke({ type: 'setTurn', currentSeatIndex: 2 });
    await invoke({ type: 'snapshot', payload: { state: 1 } });
    await invoke({ type: 'endGame', winnerSeatIndex: null });
    await invoke({ type: 'startGame' });

    expect(roomService.handleSetTurn).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      currentSeatIndex: 2,
    });
    expect(roomService.handleSnapshot).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      payload: { state: 1 },
    });
    expect(roomService.handleEndGame).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      winnerSeatIndex: null,
    });
    expect(roomService.startGame).toHaveBeenCalledWith(expect.anything(), { connectionId: 'conn-1' });
  });

  it('routes the lobby messages', async () => {
    await invoke({ type: 'setReady', playerName: 'Alice' });
    await invoke({ type: 'setUnready' });
    await invoke({ type: 'kickSeat', targetSeatIndex: 3 });
    await invoke({ type: 'leaveLobby' });

    expect(roomService.handleSetReady).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      playerName: 'Alice',
    });
    expect(roomService.handleSetUnready).toHaveBeenCalledWith(expect.anything(), { connectionId: 'conn-1' });
    expect(roomService.handleKickSeat).toHaveBeenCalledWith(expect.anything(), {
      connectionId: 'conn-1',
      targetSeatIndex: 3,
    });
    expect(roomService.handleLeaveLobby).toHaveBeenCalledWith(expect.anything(), { connectionId: 'conn-1' });
  });

  it('treats ping as a no-op', async () => {
    const result = await invoke({ type: 'ping' });

    expect(result.statusCode).toBe(200);
    expect(roomService.handleRelay).not.toHaveBeenCalled();
  });

  it('rejects a malformed message with a 400 and an actionRejected', async () => {
    const result = await invoke({ type: 'relay' }); // missing kind/payload

    expect(result.statusCode).toBe(400);
    expect(roomService.rejectAction).toHaveBeenCalled();
    expect(captureBackendException).not.toHaveBeenCalled();
  });

  it('rejects a client error without reporting it to Sentry', async () => {
    vi.mocked(roomService.startGame).mockRejectedValueOnce(new ClientError('Only the host can start the room', 403));

    const result = await invoke({ type: 'startGame' });

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('rejected');
    expect(roomService.rejectAction).toHaveBeenCalledWith(
      expect.anything(),
      'conn-1',
      'Only the host can start the room',
    );
    expect(captureBackendException).not.toHaveBeenCalled();
  });

  it('reports an unexpected error to Sentry and still rejects', async () => {
    vi.mocked(roomService.handleRelay).mockRejectedValueOnce(new Error('boom'));

    const result = await invoke({ type: 'relay', kind: 'event', payload: { resync: true } });

    expect(result.statusCode).toBe(200);
    expect(captureBackendException).toHaveBeenCalled();
    expect(roomService.rejectAction).toHaveBeenCalledWith(expect.anything(), 'conn-1', 'boom');
  });
});
