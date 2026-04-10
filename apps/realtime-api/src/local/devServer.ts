import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { ZodError } from 'zod';
import type { RawData } from 'ws';
import { WebSocketServer } from 'ws';

import {
  clientMessageSchema,
  createRoomRequestSchema,
  joinRoomRequestSchema,
  type ClientMessage,
} from '@skipbo/multiplayer-protocol';

import { isClientError } from '../errors/clientError.js';
import { captureBackendException } from '../monitoring/sentry.js';
import {
  authenticateConnection,
  createRoom,
  handleAction,
  handleDisconnect,
  joinRoom,
  rejectAction,
} from '../services/roomService.js';
import { InMemoryConnectionRepository, InMemoryRoomRepository } from './inMemoryRepositories.js';
import { LocalRealtimeBroadcaster } from './localBroadcaster.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8787;
const WS_PATH = '/ws';

const CORS_HEADERS = {
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-origin': '*',
};

interface Logger {
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

export interface LocalRealtimeDevServerOptions {
  host?: string;
  port?: number;
  publicHost?: string;
  logger?: Logger;
}

export interface LocalRealtimeDevServer {
  close: () => Promise<void>;
  host: string;
  httpUrl: string;
  port: number;
  wsUrl: string;
}

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  const requestStream = request as AsyncIterable<Buffer | string>;

  for await (const chunk of requestStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void => {
  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    'content-type': 'application/json',
  });
  response.end(JSON.stringify(body));
};

const sendNoContent = (response: ServerResponse): void => {
  response.writeHead(204, CORS_HEADERS);
  response.end();
};

const rawDataToString = (data: RawData): string => {
  if (typeof data === 'string') {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }

  return Buffer.from(data).toString('utf8');
};

const parseClientMessage = (data: RawData): ClientMessage => {
  const body = rawDataToString(data);
  return clientMessageSchema.parse(JSON.parse(body));
};

export const startLocalRealtimeDevServer = async (
  options: LocalRealtimeDevServerOptions = {},
): Promise<LocalRealtimeDevServer> => {
  const logger = options.logger ?? console;
  const host = options.host ?? DEFAULT_HOST;
  const requestedPort = options.port ?? DEFAULT_PORT;
  const publicHost = options.publicHost ?? host;

  const broadcaster = new LocalRealtimeBroadcaster();
  const connectionRepository = new InMemoryConnectionRepository();
  const roomRepository = new InMemoryRoomRepository();

  let resolvedPort = requestedPort;
  let websocketUrl = `ws://${publicHost}:${resolvedPort}${WS_PATH}`;

  const createDependencies = (overrideWebsocketUrl?: string) => ({
    broadcaster,
    connectionRepository,
    roomRepository,
    websocketUrl: overrideWebsocketUrl ?? websocketUrl,
  });

  const httpServer = createServer((request, response) => {
    void (async () => {
      if (!request.url) {
        sendJson(response, 400, { message: 'Missing request URL' });
        return;
      }

      if (request.method === 'OPTIONS') {
        sendNoContent(response);
        return;
      }

      const requestUrl = new URL(request.url, `http://${request.headers.host ?? `${publicHost}:${resolvedPort}`}`);

      try {
        if (request.method === 'GET' && requestUrl.pathname === '/health') {
          sendJson(response, 200, {
            status: 'ok',
            wsUrl: websocketUrl,
          });
          return;
        }

        if (request.method === 'POST' && requestUrl.pathname === '/rooms') {
          const body = createRoomRequestSchema.parse(await readJsonBody(request));
          const requestWsUrl = `ws://${request.headers.host ?? `${publicHost}:${resolvedPort}`}${WS_PATH}`;
          const room = await createRoom(createDependencies(requestWsUrl), body);
          sendJson(response, 201, room);
          return;
        }

        if (request.method === 'POST' && requestUrl.pathname === '/rooms/join') {
          const body = joinRoomRequestSchema.parse(await readJsonBody(request));
          const requestWsUrl = `ws://${request.headers.host ?? `${publicHost}:${resolvedPort}`}${WS_PATH}`;
          const room = await joinRoom(createDependencies(requestWsUrl), body);
          sendJson(response, 200, room);
          return;
        }

        sendJson(response, 404, { message: 'Not found' });
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJson(response, 400, { message: 'Invalid JSON body' });
          return;
        }

        if (error instanceof ZodError) {
          sendJson(response, 400, { message: error.message });
          return;
        }

        if (isClientError(error)) {
          sendJson(response, error.statusCode, { message: error.message });
          return;
        }

        captureBackendException(error, {
          handler: 'local-dev-http',
          route: `${request.method ?? 'UNKNOWN'} ${requestUrl.pathname}`,
          transport: 'http',
        });

        sendJson(response, 500, { message: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
  });

  const websocketServer = new WebSocketServer({ noServer: true });

  websocketServer.on('connection', (socket) => {
    const connectionId = randomUUID();
    broadcaster.attach(connectionId, socket);

    socket.on('message', (data) => {
      void (async () => {
        try {
          const message = parseClientMessage(data);
          const dependencies = createDependencies();

          switch (message.type) {
            case 'auth':
              await authenticateConnection(dependencies, {
                connectionId,
                roomCode: message.roomCode,
                seatIndex: message.seatIndex,
                seatToken: message.seatToken,
              });
              break;
            case 'action':
              await handleAction(dependencies, {
                action: message.action,
                connectionId,
              });
              break;
            case 'ping':
              break;
          }
        } catch (error) {
          if (!(error instanceof ZodError) && !isClientError(error)) {
            captureBackendException(error, {
              connectionId,
              handler: 'local-dev-ws',
              route: 'message',
              transport: 'ws',
            });
          }

          try {
            await rejectAction(
              createDependencies(),
              connectionId,
              error instanceof Error ? error.message : 'Unknown error',
            );
          } catch (rejectError) {
            logger.warn('Failed to send local websocket rejection', rejectError);
          }
        }
      })();
    });

    socket.on('close', () => {
      broadcaster.detach(connectionId);
      void handleDisconnect(createDependencies(), connectionId).catch((error) => {
        logger.warn('Failed to handle local websocket disconnect', error);
      });
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    if (!request.url) {
      socket.destroy();
      return;
    }

    const requestUrl = new URL(request.url, `http://${request.headers.host ?? `${publicHost}:${resolvedPort}`}`);
    if (requestUrl.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit('connection', websocket, request);
    });
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      httpServer.off('error', onError);
      reject(error);
    };

    httpServer.once('error', onError);
    httpServer.listen(requestedPort, host, () => {
      httpServer.off('error', onError);
      resolve();
    });
  });

  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve local dev server address');
  }

  resolvedPort = address.port;
  websocketUrl = `ws://${publicHost}:${resolvedPort}${WS_PATH}`;
  const httpUrl = `http://${publicHost}:${resolvedPort}`;

  return {
    close: async () => {
      websocketServer.clients.forEach((client) => {
        client.close();
      });

      await new Promise<void>((resolve, reject) => {
        websocketServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    host,
    httpUrl,
    port: resolvedPort,
    wsUrl: websocketUrl,
  };
};
