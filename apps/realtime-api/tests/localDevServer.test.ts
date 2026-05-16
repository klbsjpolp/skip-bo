import { afterEach, describe, expect, it } from 'vitest';
import type { RawData } from 'ws';
import WebSocket from 'ws';

import type { CreateRoomResponse, JoinRoomResponse, ServerMessage } from '@skipbo/multiplayer-protocol';

import type { LocalRealtimeDevServer } from '../src/local/devServer.js';
import { startLocalRealtimeDevServer } from '../src/local/devServer.js';

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

  it('serves room HTTP endpoints and websocket gameplay locally', async () => {
    server = await startLocalRealtimeDevServer({
      logger: silentLogger,
      port: 0,
    });

    const healthResponse = await fetch(`${server.httpUrl}/health`);
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.headers.get('access-control-allow-origin')).toBe('*');
    await expect(healthResponse.json()).resolves.toEqual({
      status: 'ok',
      wsUrl: server.wsUrl,
    });

    const createResponse = await fetch(`${server.httpUrl}/rooms`, {
      body: JSON.stringify({ stockSize: 35 }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as CreateRoomResponse;

    const joinResponse = await fetch(`${server.httpUrl}/rooms/join`, {
      body: JSON.stringify({ roomCode: created.roomCode.toLowerCase() }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    expect(joinResponse.status).toBe(200);
    const joined = (await joinResponse.json()) as JoinRoomResponse;

    expect(created.wsUrl).toBe(server.wsUrl);
    expect(joined.wsUrl).toBe(server.wsUrl);

    const socket0 = new WebSocket(created.wsUrl);
    const socket1 = new WebSocket(joined.wsUrl);

    await Promise.all([waitForOpen(socket0), waitForOpen(socket1)]);

    const waitingSnapshot0 = waitForMessage(
      socket0,
      (message) =>
        message.type === 'snapshot' &&
        message.view.room.status === 'WAITING' &&
        message.view.room.connectedSeats.length === 2,
    );
    const waitingSnapshot1 = waitForMessage(
      socket1,
      (message) =>
        message.type === 'snapshot' &&
        message.view.room.status === 'WAITING' &&
        message.view.room.connectedSeats.length === 2,
    );
    const activeSnapshot0 = waitForMessage(
      socket0,
      (message) => message.type === 'snapshot' && message.view.room.status === 'ACTIVE',
    );
    const activeSnapshot1 = waitForMessage(
      socket1,
      (message) => message.type === 'snapshot' && message.view.room.status === 'ACTIVE',
    );

    socket0.send(
      JSON.stringify({
        roomCode: created.roomCode,
        seatIndex: created.seatIndex,
        seatToken: created.seatToken,
        type: 'auth',
      }),
    );
    socket1.send(
      JSON.stringify({
        roomCode: joined.roomCode,
        seatIndex: joined.seatIndex,
        seatToken: joined.seatToken,
        type: 'auth',
      }),
    );

    await expect(waitingSnapshot0).resolves.toMatchObject({
      type: 'snapshot',
      view: {
        room: {
          connectedSeats: [0, 1],
          status: 'WAITING',
        },
      },
    });
    await expect(waitingSnapshot1).resolves.toMatchObject({
      type: 'snapshot',
      view: {
        room: {
          connectedSeats: [0, 1],
          status: 'WAITING',
        },
      },
    });

    const readyPresence0 = waitForMessage(
      socket0,
      (message) =>
        message.type === 'presence' &&
        message.room.lobbySeats.length === 2 &&
        message.room.lobbySeats.every((s: { readyState: string }) => s.readyState === 'ready'),
    );

    socket0.send(JSON.stringify({ type: 'setReady', playerName: 'Alice' }));
    socket1.send(JSON.stringify({ type: 'setReady', playerName: 'Bob' }));

    await expect(readyPresence0).resolves.toMatchObject({
      type: 'presence',
      room: { status: 'WAITING' },
    });

    socket0.send(
      JSON.stringify({
        type: 'startGame',
        clientVersion: 3,
      }),
    );

    const [resolvedActiveSnapshot0, resolvedActiveSnapshot1] = await Promise.all([activeSnapshot0, activeSnapshot1]);

    expect(resolvedActiveSnapshot0).toMatchObject({
      type: 'snapshot',
      view: {
        room: {
          status: 'ACTIVE',
        },
      },
    });
    expect(resolvedActiveSnapshot1).toMatchObject({
      type: 'snapshot',
      view: {
        room: {
          status: 'ACTIVE',
        },
      },
    });

    // `startGame` shuffles `activeSeatIndices`, so the first turn can land on
    // either socket. Each viewer's snapshot rotates `currentPlayerIndex` so
    // that `0` means "viewer is the current player". Pick the socket that
    // owns the turn before issuing SELECT_CARD; otherwise the action is
    // rejected with "It is not your turn" and the test would time out.
    const currentSocket =
      resolvedActiveSnapshot0.type === 'snapshot' && resolvedActiveSnapshot0.view.currentPlayerIndex === 0
        ? socket0
        : socket1;

    const selectedSnapshot0 = waitForMessage(
      socket0,
      (message) => message.type === 'snapshot' && message.view.selectedCard?.source === 'hand',
    );
    const selectedSnapshot1 = waitForMessage(
      socket1,
      (message) => message.type === 'snapshot' && message.view.selectedCard?.source === 'hand',
    );

    currentSocket.send(
      JSON.stringify({
        action: {
          index: 0,
          source: 'hand',
          type: 'SELECT_CARD',
        },
        type: 'action',
      }),
    );

    await expect(selectedSnapshot0).resolves.toMatchObject({
      type: 'snapshot',
      view: {
        selectedCard: {
          source: 'hand',
        },
      },
    });
    await expect(selectedSnapshot1).resolves.toMatchObject({
      type: 'snapshot',
      view: {
        selectedCard: {
          source: 'hand',
        },
      },
    });

    socket0.close();
    socket1.close();
  });
});
