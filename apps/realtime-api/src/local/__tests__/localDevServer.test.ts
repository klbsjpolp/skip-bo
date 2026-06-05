import { afterEach, describe, expect, it } from 'vitest';
import type { RawData } from 'ws';
import WebSocket from 'ws';

import {
  PROTOCOL_VERSION,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type ServerMessage,
} from '@skipbo/realtime-core';

import type { LocalRealtimeDevServer } from '../devServer.js';
import { startLocalRealtimeDevServer } from '../devServer.js';

const silentLogger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

const waitForOpen = async (socket: WebSocket): Promise<void> => {
  if (socket.readyState === WebSocket.OPEN) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.off('error', onError);
      socket.off('open', onOpen);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    socket.on('error', onError);
    socket.on('open', onOpen);
  });
};

const waitForMessage = (socket: WebSocket, predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off('close', onClose);
      socket.off('error', onError);
      socket.off('message', onMessage);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('socket closed before matching message'));
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onMessage = (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as ServerMessage;

        if (!predicate(message)) {
          return;
        }

        cleanup();
        resolve(message);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    socket.on('close', onClose);
    socket.on('error', onError);
    socket.on('message', onMessage);
  });

describe('local realtime dev server', () => {
  let server: LocalRealtimeDevServer | null = null;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await server.close();
    server = null;
  });

  it('serves room HTTP endpoints and relays opaque gameplay messages locally', async () => {
    server = await startLocalRealtimeDevServer({
      logger: silentLogger,
      port: 0,
    });

    const healthResponse = await fetch(`${server.httpUrl}/health`);
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.headers.get('access-control-allow-origin')).toBe('*');

    const createResponse = await fetch(`${server.httpUrl}/rooms`, {
      body: JSON.stringify({ gameId: 'skipbo', gameConfig: { stockSize: 35 } }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as CreateRoomResponse;

    const joinResponse = await fetch(`${server.httpUrl}/rooms/join`, {
      body: JSON.stringify({ roomCode: created.roomCode.toLowerCase() }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    expect(joinResponse.status).toBe(200);
    const joined = (await joinResponse.json()) as JoinRoomResponse;

    const socket0 = new WebSocket(created.wsUrl);
    const socket1 = new WebSocket(joined.wsUrl);
    await Promise.all([waitForOpen(socket0), waitForOpen(socket1)]);

    const seatToSocket: Record<number, WebSocket> = {
      [created.seatIndex]: socket0,
      [joined.seatIndex]: socket1,
    };

    const waitingPresence = waitForMessage(
      socket0,
      (message) =>
        message.type === 'presence' && message.room.status === 'WAITING' && message.room.connectedSeats.length === 2,
    );
    // The host (seat 0) reconnect snapshot is null until it pushes one. Register
    // before sending auth so we don't miss the message.
    const restore = waitForMessage(socket0, (message) => message.type === 'snapshotRestore');

    socket0.send(
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        roomCode: created.roomCode,
        seatIndex: created.seatIndex,
        seatToken: created.seatToken,
        type: 'auth',
      }),
    );
    socket1.send(
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        roomCode: joined.roomCode,
        seatIndex: joined.seatIndex,
        seatToken: joined.seatToken,
        type: 'auth',
      }),
    );

    await expect(waitingPresence).resolves.toMatchObject({
      type: 'presence',
      room: { connectedSeats: [0, 1], status: 'WAITING' },
    });
    await expect(restore).resolves.toMatchObject({ type: 'snapshotRestore', payload: null });

    const readyPresence = waitForMessage(
      socket0,
      (message) =>
        message.type === 'presence' &&
        message.room.lobbySeats.length === 2 &&
        message.room.lobbySeats.every((s) => s.readyState === 'ready'),
    );
    socket0.send(JSON.stringify({ type: 'setReady', playerName: 'Alice' }));
    socket1.send(JSON.stringify({ type: 'setReady', playerName: 'Bob' }));
    await readyPresence;

    const gameStarted0 = waitForMessage(socket0, (message) => message.type === 'gameStarted');
    const gameStarted1 = waitForMessage(socket1, (message) => message.type === 'gameStarted');

    socket0.send(JSON.stringify({ type: 'startGame', clientVersion: 2 }));

    const [started0, started1] = await Promise.all([gameStarted0, gameStarted1]);
    if (started0.type !== 'gameStarted' || started1.type !== 'gameStarted') {
      throw new Error('expected gameStarted');
    }
    expect(started0.activeSeatIndices).toEqual(expect.arrayContaining([0, 1]));
    expect(started0.gameConfig).toEqual({ stockSize: 35 });
    expect([0, 1]).toContain(started0.currentSeatIndex);

    // The current seat sends an opaque move; the other seat receives it relayed.
    const currentSeat = started0.currentSeatIndex;
    const otherSeat = currentSeat === created.seatIndex ? joined.seatIndex : created.seatIndex;
    const relayed = waitForMessage(seatToSocket[otherSeat], (message) => message.type === 'relayed');

    seatToSocket[currentSeat].send(
      JSON.stringify({
        type: 'relay',
        kind: 'move',
        payload: { type: 'SELECT_CARD', source: 'hand', index: 0 },
      }),
    );

    await expect(relayed).resolves.toMatchObject({
      type: 'relayed',
      fromSeat: currentSeat,
      kind: 'move',
      payload: { type: 'SELECT_CARD', source: 'hand', index: 0 },
    });

    // The host advances the abstract turn; everyone hears about it.
    const turn1 = waitForMessage(socket1, (message) => message.type === 'turn');
    socket0.send(JSON.stringify({ type: 'setTurn', currentSeatIndex: otherSeat }));
    await expect(turn1).resolves.toMatchObject({ type: 'turn', currentSeatIndex: otherSeat });

    socket0.close();
    socket1.close();
  });
});
