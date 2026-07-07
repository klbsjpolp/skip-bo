import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  MIN_SUPPORTED_PROTOCOL_VERSION,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  clientMessageSchema,
  resolvePlayerName,
  shuffle,
  type ClientMessage,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type LobbyReadyState,
  type RelayKind,
  type RoomSession,
  type RoomStatus,
  type RoomSummary,
  type ServerMessage,
} from '@klbsjpolp/realtime-core';
import { WebSocketServer, type WebSocket } from 'ws';

/**
 * In-process fake of the game-agnostic relay server (realtime-infra
 * `apps/realtime-api`) for local multiplayer testing. It implements the
 * documented protocol v2 surface the web client uses — room create/join over
 * HTTP, then auth / presence / lobby / startGame / opaque relay / setTurn /
 * snapshot / endGame over WebSocket — while staying game-agnostic: payloads
 * are never inspected, exactly like the real relay.
 *
 * Intentional differences from production, for deterministic tests:
 * - room codes are sequential (AAA, AAB, …), not random
 * - `startGame` keeps the connected seats in seat order unless
 *   `shuffleSeats: true` is passed (the real server always shuffles)
 * - no persistence, no room expiry, no disconnect-grace timers
 */

interface SeatState {
  displayName: string | null;
  disconnectedAt: string | null;
  readyState: LobbyReadyState;
  reserved: boolean;
  seatToken: string;
  socket: WebSocket | null;
}

export interface MockRoom {
  activeSeatIndices: number[];
  currentSeatIndex: number | null;
  expiresAt: string;
  gameConfig: unknown;
  gameId: string;
  hostSeatIndex: number;
  roomCode: string;
  seatCapacity: number;
  seats: SeatState[];
  snapshot: unknown;
  status: RoomStatus;
  version: number;
}

export interface MockRelayServerOptions {
  /** Shuffle seats on startGame like the real server. Defaults to false so tests know seat 0 (the host) plays first. */
  shuffleSeats?: boolean;
  /** Port to listen on. Defaults to 0 (ephemeral). */
  port?: number;
}

export interface MockRelayServer {
  apiBaseUrl: string;
  port: number;
  rooms: Map<string, MockRoom>;
  close: () => Promise<void>;
}

const SEAT_CAPACITY = 4;
const ROOM_TTL_MS = 60 * 60 * 1000;

const roomCodeFromCounter = (counter: number): string => {
  let remaining = counter;
  let code = '';
  for (let position = 0; position < ROOM_CODE_LENGTH; position += 1) {
    code = ROOM_CODE_ALPHABET[remaining % ROOM_CODE_ALPHABET.length] + code;
    remaining = Math.floor(remaining / ROOM_CODE_ALPHABET.length);
  }
  return code;
};

const createSeat = (): SeatState => ({
  displayName: null,
  disconnectedAt: null,
  readyState: 'never-ready',
  reserved: false,
  seatToken: '',
  socket: null,
});

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
};

const applyCorsHeaders = (response: ServerResponse): void => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
};

const sendJson = (response: ServerResponse, status: number, payload: unknown): void => {
  applyCorsHeaders(response);
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload));
};

export const startMockRelayServer = async (options: MockRelayServerOptions = {}): Promise<MockRelayServer> => {
  const rooms = new Map<string, MockRoom>();
  let roomCounter = 0;
  let tokenCounter = 0;

  const send = (socket: WebSocket | null, message: ServerMessage): void => {
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const connectedSeatIndices = (room: MockRoom): number[] =>
    room.seats.flatMap((seat, seatIndex) => (seat.reserved && seat.socket ? [seatIndex] : []));

  const toRoomSummary = (room: MockRoom): RoomSummary => ({
    connectedSeats: connectedSeatIndices(room),
    currentSeatIndex: room.currentSeatIndex,
    disconnectedSeats: room.seats.flatMap((seat, seatIndex) =>
      seat.reserved && seat.disconnectedAt !== null ? [{ seatIndex, disconnectedAt: seat.disconnectedAt }] : [],
    ),
    expiresAt: room.expiresAt,
    hostSeatIndex: room.hostSeatIndex,
    lobbySeats: room.seats.flatMap((seat, seatIndex) =>
      seat.reserved ? [{ seatIndex, readyState: seat.readyState, displayName: seat.displayName }] : [],
    ),
    roomCode: room.roomCode,
    seatCapacity: room.seatCapacity,
    status: room.status,
    version: room.version,
  });

  const broadcastPresence = (room: MockRoom): void => {
    room.version += 1;
    const summary = toRoomSummary(room);
    for (const seat of room.seats) {
      send(seat.socket, { type: 'presence', room: summary });
    }
  };

  const reserveSeat = (room: MockRoom, seatIndex: number, playerName: string | undefined): RoomSession => {
    tokenCounter += 1;
    const seat = room.seats[seatIndex];
    seat.reserved = true;
    seat.seatToken = `seat-token-${tokenCounter}`;
    if (playerName !== undefined) {
      seat.displayName = resolvePlayerName(playerName, seatIndex);
    }
    return {
      expiresAt: room.expiresAt,
      hostSeatIndex: room.hostSeatIndex,
      roomCode: room.roomCode,
      seatCapacity: room.seatCapacity,
      seatIndex,
      seatToken: seat.seatToken,
      wsUrl: `ws://127.0.0.1:${port}/ws`,
    };
  };

  const httpServer: Server = createServer((request, response) => {
    void (async () => {
      if (request.method === 'OPTIONS') {
        applyCorsHeaders(response);
        response.writeHead(204);
        response.end();
        return;
      }

      if (request.method === 'POST' && request.url === '/rooms') {
        const body = (await readJsonBody(request)) as CreateRoomRequest;
        roomCounter += 1;
        const room: MockRoom = {
          activeSeatIndices: [],
          currentSeatIndex: null,
          expiresAt: new Date(Date.now() + ROOM_TTL_MS).toISOString(),
          gameConfig: body.gameConfig ?? null,
          gameId: body.gameId ?? 'skipbo',
          hostSeatIndex: 0,
          roomCode: roomCodeFromCounter(roomCounter),
          seatCapacity: SEAT_CAPACITY,
          seats: Array.from({ length: SEAT_CAPACITY }, createSeat),
          snapshot: null,
          status: 'WAITING',
          version: 0,
        };
        rooms.set(room.roomCode, room);
        sendJson(response, 201, reserveSeat(room, 0, body.playerName));
        return;
      }

      if (request.method === 'POST' && request.url === '/rooms/join') {
        const body = (await readJsonBody(request)) as JoinRoomRequest;
        const room = rooms.get((body.roomCode ?? '').toUpperCase());
        if (!room) {
          sendJson(response, 404, { message: 'Partie introuvable.' });
          return;
        }
        if (room.status !== 'WAITING') {
          sendJson(response, 409, { message: 'La partie a déjà commencé.' });
          return;
        }
        const seatIndex = room.seats.findIndex((seat) => !seat.reserved);
        if (seatIndex === -1) {
          sendJson(response, 409, { message: 'La partie est complète.' });
          return;
        }
        const session = reserveSeat(room, seatIndex, body.playerName);
        broadcastPresence(room);
        sendJson(response, 200, session);
        return;
      }

      sendJson(response, 404, { message: 'Route inconnue.' });
    })();
  });

  const webSocketServer = new WebSocketServer({ server: httpServer });

  webSocketServer.on('connection', (socket: WebSocket) => {
    let authenticatedRoom: MockRoom | null = null;
    let authenticatedSeatIndex = -1;

    const rejectAndClose = (code: 'not_authenticated' | 'forbidden', reason: string): void => {
      send(socket, { type: 'actionRejected', code, reason });
      socket.close();
    };

    const handleAuthenticated = (room: MockRoom, seatIndex: number, message: ClientMessage): void => {
      const isHost = seatIndex === room.hostSeatIndex;

      switch (message.type) {
        case 'ping':
        case 'auth':
          return;
        case 'setReady': {
          const seat = room.seats[seatIndex];
          seat.readyState = 'ready';
          seat.displayName = resolvePlayerName(message.playerName, seatIndex);
          broadcastPresence(room);
          return;
        }
        case 'setUnready': {
          room.seats[seatIndex].readyState = 'unready';
          broadcastPresence(room);
          return;
        }
        case 'startGame': {
          const connected = connectedSeatIndices(room);
          const everyoneReady = connected.every((seat) => room.seats[seat].readyState === 'ready');
          if (!isHost || room.status !== 'WAITING' || connected.length < 2 || !everyoneReady) {
            send(socket, {
              type: 'actionRejected',
              code: 'invalid_state',
              reason: 'Impossible de démarrer la partie.',
            });
            return;
          }
          room.status = 'ACTIVE';
          room.activeSeatIndices = options.shuffleSeats ? shuffle(connected) : connected;
          room.currentSeatIndex = room.activeSeatIndices[0];
          broadcastPresence(room);
          const summary = toRoomSummary(room);
          for (const seat of connected) {
            send(room.seats[seat].socket, {
              type: 'gameStarted',
              activeSeatIndices: room.activeSeatIndices,
              currentSeatIndex: summary.currentSeatIndex ?? 0,
              gameConfig: room.gameConfig,
            });
          }
          return;
        }
        case 'relay': {
          const kind: RelayKind = message.kind;
          if (kind === 'move' && seatIndex !== room.currentSeatIndex) {
            send(socket, { type: 'actionRejected', code: 'not_your_turn', reason: 'Ce n’est pas votre tour.' });
            return;
          }
          if (kind === 'view' && !isHost) {
            send(socket, { type: 'actionRejected', code: 'forbidden', reason: 'Seul l’hôte peut envoyer une vue.' });
            return;
          }
          const targetSeats =
            message.toSeats ?? room.seats.flatMap((_, otherSeat) => (otherSeat === seatIndex ? [] : [otherSeat]));
          for (const targetSeat of targetSeats) {
            send(room.seats[targetSeat]?.socket ?? null, {
              type: 'relayed',
              fromSeat: seatIndex,
              kind,
              payload: message.payload,
            });
          }
          return;
        }
        case 'setTurn': {
          if (!isHost) {
            send(socket, { type: 'actionRejected', code: 'forbidden', reason: 'Seul l’hôte peut changer le tour.' });
            return;
          }
          room.currentSeatIndex = message.currentSeatIndex;
          for (const seat of room.seats) {
            if (seat.socket !== socket) {
              send(seat.socket, { type: 'turn', currentSeatIndex: message.currentSeatIndex });
            }
          }
          return;
        }
        case 'snapshot': {
          if (isHost) {
            room.snapshot = message.payload;
          }
          return;
        }
        case 'endGame': {
          if (!isHost) {
            return;
          }
          room.status = 'FINISHED';
          room.currentSeatIndex = null;
          broadcastPresence(room);
          return;
        }
        case 'kickSeat': {
          if (!isHost || room.status !== 'WAITING') {
            return;
          }
          const target = room.seats[message.targetSeatIndex];
          if (!target?.reserved || message.targetSeatIndex === room.hostSeatIndex) {
            return;
          }
          send(target.socket, { type: 'actionRejected', code: 'forbidden', reason: 'Vous avez été exclu.' });
          target.socket?.close();
          room.seats[message.targetSeatIndex] = createSeat();
          broadcastPresence(room);
          return;
        }
        case 'leaveLobby': {
          if (isHost && room.status === 'WAITING') {
            for (const seat of room.seats) {
              if (seat.socket !== socket) {
                send(seat.socket, { type: 'roomClosed', roomCode: room.roomCode, status: 'WAITING' });
              }
            }
            rooms.delete(room.roomCode);
            return;
          }
          room.seats[seatIndex] = createSeat();
          broadcastPresence(room);
          return;
        }
      }
    };

    socket.on('message', (data: Buffer | string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof data === 'string' ? data : data.toString('utf8'));
      } catch {
        return;
      }

      const result = clientMessageSchema.safeParse(parsed);
      if (!result.success) {
        send(socket, { type: 'actionRejected', code: 'invalid_action', reason: 'Message invalide.' });
        return;
      }
      const message = result.data;

      if (!authenticatedRoom) {
        if (message.type !== 'auth') {
          rejectAndClose('not_authenticated', 'Authentifiez-vous d’abord.');
          return;
        }
        const room = rooms.get(message.roomCode.toUpperCase());
        const seat = room?.seats[message.seatIndex];
        if (!room || !seat?.reserved || seat.seatToken !== message.seatToken) {
          rejectAndClose('not_authenticated', 'Session invalide.');
          return;
        }
        if ((message.protocolVersion ?? 1) < MIN_SUPPORTED_PROTOCOL_VERSION) {
          rejectAndClose('forbidden', 'Version du protocole non supportée.');
          return;
        }
        seat.socket?.close();
        seat.socket = socket;
        seat.disconnectedAt = null;
        authenticatedRoom = room;
        authenticatedSeatIndex = message.seatIndex;
        broadcastPresence(room);
        if (message.seatIndex === room.hostSeatIndex && room.status === 'ACTIVE') {
          send(socket, { type: 'snapshotRestore', payload: room.snapshot });
        }
        return;
      }

      handleAuthenticated(authenticatedRoom, authenticatedSeatIndex, message);
    });

    socket.on('close', () => {
      const room = authenticatedRoom;
      if (!room) {
        return;
      }
      const seat = room.seats[authenticatedSeatIndex];
      if (seat?.socket === socket) {
        seat.socket = null;
        if (room.status === 'ACTIVE') {
          seat.disconnectedAt = new Date().toISOString();
        }
        broadcastPresence(room);
      }
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(options.port ?? 0, '127.0.0.1', resolve);
  });
  const port = (httpServer.address() as AddressInfo).port;

  return {
    apiBaseUrl: `http://127.0.0.1:${port}`,
    port,
    rooms,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of webSocketServer.clients) {
          client.terminate();
        }
        webSocketServer.close(() => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }),
  };
};
