import type {GameAction} from '@skipbo/game-core';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ServerMessage
} from '@skipbo/multiplayer-protocol';
import {normalizeRoomCode, serializeClientGameView} from '@skipbo/multiplayer-protocol';

import type {ConnectionRecord, ConnectionRepository, RoomRecord, RoomRepository} from '../repositories/types.js';
import {ClientError} from '../errors/clientError.js';
import type {RealtimeBroadcaster} from './broadcaster.js';
import {applyOnlineAction, createOnlineInitialGameState, validateOnlineAction} from './gameState.js';
import {createRoomCode} from './roomCode.js';
import {createSeatToken, hashSeatToken} from './tokens.js';

interface RoomServiceDependencies {
  broadcaster: RealtimeBroadcaster;
  connectionRepository: ConnectionRepository;
  roomRepository: RoomRepository;
  websocketUrl: string;
}

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

const createExpiryTimestamp = (updatedAt: string): number =>
  Math.floor((new Date(updatedAt).getTime() + ROOM_TTL_MS) / 1000);

const getConnectedSeats = (connections: ConnectionRecord[]): number[] =>
  [...new Set(connections.map((connection) => connection.seatIndex))].sort((left, right) => left - right);

const getAuthenticatedSeats = (room: RoomRecord): number[] =>
  [...new Set(room.authenticatedSeats ?? [])].sort((left, right) => left - right);

const buildRoomSession = (
  roomCode: string,
  seatIndex: number,
  seatToken: string,
  websocketUrl: string,
  expiresAt: number,
): CreateRoomResponse => ({
  expiresAt: new Date(expiresAt * 1000).toISOString(),
  roomCode,
  seatIndex,
  seatToken,
  wsUrl: websocketUrl,
});

const toRoomClosedMessage = (room: RoomRecord): ServerMessage => ({
  roomCode: room.roomCode,
  status: room.status,
  type: 'roomClosed',
});

const broadcastPresence = async (
  dependencies: RoomServiceDependencies,
  room: RoomRecord,
  connectedSeatsOverride?: number[],
): Promise<void> => {
  const connections = await dependencies.connectionRepository.listByRoomCode(room.roomCode);
  const connectedSeats = connectedSeatsOverride ?? getConnectedSeats(connections);
  const message: ServerMessage = {
    room: {
      connectedSeats,
      expiresAt: new Date(room.expiresAt * 1000).toISOString(),
      roomCode: room.roomCode,
      status: room.status,
      version: room.version,
    },
    type: 'presence',
  };

  await Promise.allSettled(connections.map(async (connection) => {
    await dependencies.broadcaster.send(connection.connectionId, message);
  }));
};

const broadcastSnapshots = async (
  dependencies: RoomServiceDependencies,
  room: RoomRecord,
  connectedSeatsOverride?: number[],
): Promise<void> => {
  const connections = await dependencies.connectionRepository.listByRoomCode(room.roomCode);
  const connectedSeats = connectedSeatsOverride ?? getConnectedSeats(connections);

  await Promise.allSettled(connections.map(async (connection) => {
    await dependencies.broadcaster.send(connection.connectionId, {
      type: 'snapshot',
      view: serializeClientGameView({
        connectedSeats,
        expiresAt: new Date(room.expiresAt * 1000).toISOString(),
        gameState: room.state,
        roomCode: room.roomCode,
        status: room.status,
        version: room.version,
        viewerSeatIndex: connection.seatIndex,
      }),
    });
  }));

  if (room.status === 'FINISHED') {
    await Promise.allSettled(connections.map(async (connection) => {
      await dependencies.broadcaster.send(connection.connectionId, toRoomClosedMessage(room));
    }));
  }
};

const buildUpdatedRoom = (room: RoomRecord, overrides: Partial<RoomRecord>): RoomRecord => {
  const updatedAt = overrides.updatedAt ?? new Date().toISOString();

  return {
    ...room,
    ...overrides,
    expiresAt: overrides.expiresAt ?? createExpiryTimestamp(updatedAt),
    updatedAt,
  };
};

const isStaleConnectionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    name?: string;
  };

  return candidate.name === 'GoneException' || candidate.$metadata?.httpStatusCode === 410;
};

const getAuthenticatedConnection = async (
  dependencies: RoomServiceDependencies,
  connectionId: string,
): Promise<ConnectionRecord> => {
  const connection = await dependencies.connectionRepository.get(connectionId);

  if (!connection) {
    throw new ClientError('Connexion non authentifiée', 401);
  }

  return connection;
};

export const createRoom = async (
  dependencies: RoomServiceDependencies,
  request: CreateRoomRequest = {},
): Promise<CreateRoomResponse> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const roomCode = createRoomCode();
    const seatToken = createSeatToken();
    const createdAt = new Date().toISOString();
    const room: RoomRecord = {
      authenticatedSeats: [],
      createdAt,
      expiresAt: createExpiryTimestamp(createdAt),
      roomCode,
      seatTokenHashes: [hashSeatToken(seatToken), null],
      state: createOnlineInitialGameState(request.stockSize),
      status: 'WAITING',
      summary: null,
      updatedAt: createdAt,
      version: 1,
    };

    try {
      await dependencies.roomRepository.create(room);

      return buildRoomSession(roomCode, 0, seatToken, dependencies.websocketUrl, room.expiresAt);
    } catch (error) {
      if (attempt === 19) {
        throw error;
      }
    }
  }

  throw new Error('Unable to create room');
};

export const joinRoom = async (
  dependencies: RoomServiceDependencies,
  request: JoinRoomRequest,
): Promise<JoinRoomResponse> => {
  const roomCode = normalizeRoomCode(request.roomCode);
  const room = await dependencies.roomRepository.get(roomCode);

  if (!room) {
    throw new ClientError('Room not found', 404);
  }

  if (room.seatTokenHashes[1]) {
    throw new ClientError('Room is full', 409);
  }

  const seatToken = createSeatToken();
  const updatedRoom = buildUpdatedRoom(room, {
    seatTokenHashes: [room.seatTokenHashes[0], hashSeatToken(seatToken)],
  });

  await dependencies.roomRepository.update(updatedRoom);

  return buildRoomSession(roomCode, 1, seatToken, dependencies.websocketUrl, updatedRoom.expiresAt);
};

export const authenticateConnection = async (
  dependencies: RoomServiceDependencies,
  input: {
    connectionId: string;
    roomCode: string;
    seatIndex: number;
    seatToken: string;
  },
): Promise<void> => {
  const room = await dependencies.roomRepository.get(normalizeRoomCode(input.roomCode));

  if (!room) {
    throw new ClientError('Room not found', 404);
  }

  const expectedHash = room.seatTokenHashes[input.seatIndex];

  if (!expectedHash || expectedHash !== hashSeatToken(input.seatToken)) {
    throw new ClientError('Invalid seat token', 401);
  }

  const now = new Date().toISOString();
  await dependencies.connectionRepository.put({
    connectedAt: now,
    connectionId: input.connectionId,
    roomCode: room.roomCode,
    seatIndex: input.seatIndex,
    updatedAt: now,
  });

  const existingConnections = await dependencies.connectionRepository.listByRoomCode(room.roomCode);
  const connectedSeats = [...new Set([...getConnectedSeats(existingConnections), input.seatIndex])].sort((left, right) => left - right);
  const authenticatedSeats = [...new Set([...getAuthenticatedSeats(room), input.seatIndex])].sort((left, right) => left - right);
  const nextStatus = authenticatedSeats.length === 2 ? 'ACTIVE' : room.status;
  const updatedRoom = buildUpdatedRoom(room, {
    authenticatedSeats,
    status: nextStatus,
  });

  await dependencies.roomRepository.update(updatedRoom);
  await broadcastPresence(dependencies, updatedRoom, connectedSeats);
  await broadcastSnapshots(dependencies, updatedRoom, connectedSeats);
};

export const handleAction = async (
  dependencies: RoomServiceDependencies,
  input: {
    action: GameAction;
    connectionId: string;
  },
): Promise<void> => {
  const connection = await getAuthenticatedConnection(dependencies, input.connectionId);
  const room = await dependencies.roomRepository.get(connection.roomCode);

  if (!room) {
    throw new ClientError('Room not found', 404);
  }

  if (room.status === 'FINISHED') {
    throw new ClientError('Room is finished', 409);
  }

  if (room.status !== 'ACTIVE') {
    throw new ClientError('Room is not active yet', 409);
  }

  if (room.state.currentPlayerIndex !== connection.seatIndex) {
    throw new ClientError('It is not your turn', 409);
  }

  const validationError = validateOnlineAction(room.state, input.action);

  if (validationError) {
    throw new ClientError(validationError, 400);
  }

  const nextState = applyOnlineAction(room.state, input.action);
  const nextRoom = buildUpdatedRoom(room, {
    state: nextState,
    status: nextState.gameIsOver ? 'FINISHED' : room.status,
    summary: nextState.gameIsOver
      ? {
          finishedAt: new Date().toISOString(),
          winnerIndex: nextState.winnerIndex,
        }
      : room.summary,
    version: room.version + 1,
  });

  await dependencies.roomRepository.update(nextRoom);
  await broadcastSnapshots(dependencies, nextRoom);
  await broadcastPresence(dependencies, nextRoom);
};

export const handleDisconnect = async (
  dependencies: RoomServiceDependencies,
  connectionId: string,
): Promise<void> => {
  const connection = await dependencies.connectionRepository.get(connectionId);

  if (!connection) {
    return;
  }

  await dependencies.connectionRepository.delete(connectionId);
  const room = await dependencies.roomRepository.get(connection.roomCode);

  if (!room) {
    return;
  }

  const updatedRoom = buildUpdatedRoom(room, {});
  await dependencies.roomRepository.update(updatedRoom);
  await broadcastPresence(dependencies, updatedRoom);
};

export const rejectAction = async (
  dependencies: RoomServiceDependencies,
  connectionId: string,
  message: string,
): Promise<void> => {
  try {
    await dependencies.broadcaster.send(connectionId, {
      code: 'invalid_action',
      reason: message,
      type: 'actionRejected',
    });
  } catch (error) {
    if (!isStaleConnectionError(error)) {
      throw error;
    }

    await dependencies.connectionRepository.delete(connectionId);
  }
};
