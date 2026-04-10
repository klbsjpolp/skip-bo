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

const waitForMessage = (
  socket: WebSocket,
  predicate: (message: ServerMessage) => boolean,
): Promise<ServerMessage> => new Promise((resolve, reject) => {
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
    const created = await createResponse.json() as CreateRoomResponse;

    const joinResponse = await fetch(`${server.httpUrl}/rooms/join`, {
      body: JSON.stringify({ roomCode: created.roomCode.toLowerCase() }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    expect(joinResponse.status).toBe(200);
    const joined = await joinResponse.json() as JoinRoomResponse;

    expect(created.wsUrl).toBe(server.wsUrl);
    expect(joined.wsUrl).toBe(server.wsUrl);

    const socket0 = new WebSocket(created.wsUrl);
    const socket1 = new WebSocket(joined.wsUrl);

    await Promise.all([waitForOpen(socket0), waitForOpen(socket1)]);

    const activeSnapshot0 = waitForMessage(
      socket0,
      (message) => message.type === 'snapshot' && message.view.room.status === 'ACTIVE',
    );
    const activeSnapshot1 = waitForMessage(
      socket1,
      (message) => message.type === 'snapshot' && message.view.room.status === 'ACTIVE',
    );

    socket0.send(JSON.stringify({
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
      type: 'auth',
    }));
    socket1.send(JSON.stringify({
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
      type: 'auth',
    }));

    await expect(activeSnapshot0).resolves.toMatchObject({
      type: 'snapshot',
      view: {
        room: {
          status: 'ACTIVE',
        },
      },
    });
    await expect(activeSnapshot1).resolves.toMatchObject({
      type: 'snapshot',
      view: {
        room: {
          status: 'ACTIVE',
        },
      },
    });

    const selectedSnapshot0 = waitForMessage(
      socket0,
      (message) => message.type === 'snapshot' && message.view.selectedCard?.source === 'hand',
    );
    const selectedSnapshot1 = waitForMessage(
      socket1,
      (message) => message.type === 'snapshot' && message.view.selectedCard?.source === 'hand',
    );

    socket0.send(JSON.stringify({
      action: {
        index: 0,
        source: 'hand',
        type: 'SELECT_CARD',
      },
      type: 'action',
    }));

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
