import type {GameAction} from '@skipbo/game-core';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ServerMessage
} from '@skipbo/multiplayer-protocol';
import { normalizeRoomCode, resolvePlayerName, serializeClientGameView } from '@skipbo/multiplayer-protocol';

import { RoomVersionConflictError, type ConnectionRecord, type ConnectionRepository, type RoomRecord, type RoomRepository } from '../repositories/types.js';
import {ClientError} from '../errors/clientError.js';
import type {RealtimeBroadcaster} from './broadcaster.js';
import {applyOnlineAction, createOnlineInitialGameState, createWaitingRoomState, isDebugAction, validateOnlineAction} from './gameState.js';
import {createRoomCode} from './roomCode.js';
import {createSeatToken, hashSeatToken} from './tokens.js';

interface RoomServiceDependencies {
  broadcaster: RealtimeBroadcaster;
  connectionRepository: ConnectionRepository;
  roomRepository: RoomRepository;
  websocketUrl: string;
}

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SEAT_CAPACITY = 4;
const DEFAULT_HOST_SEAT_INDEX = 0;
const ROOM_UPDATE_MAX_ATTEMPTS = 5;

const createExpiryTimestamp = (updatedAt: string): number =>
  Math.floor((new Date(updatedAt).getTime() + ROOM_TTL_MS) / 1000);

const getConnectedSeats = (connections: ConnectionRecord[]): number[] =>
  [...new Set(connections.map((connection) => connection.seatIndex))].sort((left, right) => left - right);

const getAuthenticatedSeats = (room: RoomRecord): number[] =>
  [...new Set(room.authenticatedSeats ?? [])].sort((left, right) => left - right);

const getActiveSeatIndices = (room: RoomRecord): number[] =>
  room.activeSeatIndices
    ? [...room.activeSeatIndices]
    : room.state.players.map((player, playerIndex) => player.seatIndex ?? playerIndex);

const getViewerPlayerIndex = (room: RoomRecord, seatIndex: number): number =>
  getActiveSeatIndices(room).indexOf(seatIndex);

const getFirstOpenSeatIndex = (room: RoomRecord): number =>
  room.seatTokenHashes.findIndex((seatTokenHash) => seatTokenHash === null);

const buildRoomSession = (
  room: Pick<RoomRecord, 'expiresAt' | 'hostSeatIndex' | 'roomCode' | 'seatCapacity'>,
  seatIndex: number,
  seatToken: string,
  websocketUrl: string,
): CreateRoomResponse => ({
  expiresAt: new Date(room.expiresAt * 1000).toISOString(),
  hostSeatIndex: room.hostSeatIndex,
  roomCode: room.roomCode,
  seatCapacity: room.seatCapacity,
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
      hostSeatIndex: room.hostSeatIndex,
      roomCode: room.roomCode,
      seatCapacity: room.seatCapacity,
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
    const viewerSeatIndex = getViewerPlayerIndex(room, connection.seatIndex);

    if (viewerSeatIndex < 0) {
      return;
    }

    await dependencies.broadcaster.send(connection.connectionId, {
      type: 'snapshot',
      view: serializeClientGameView({
        connectedSeats,
        expiresAt: new Date(room.expiresAt * 1000).toISOString(),
        gameState: room.state,
        hostSeatIndex: room.hostSeatIndex,
        roomCode: room.roomCode,
        seatCapacity: room.seatCapacity,
        status: room.status,
        version: room.version,
        viewerSeatIndex,
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

const isRoomVersionConflictError = (error: unknown): error is RoomVersionConflictError =>
  error instanceof RoomVersionConflictError;

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
    const waitingRoomState = createWaitingRoomState(request.stockSize, DEFAULT_SEAT_CAPACITY);
    waitingRoomState.players[DEFAULT_HOST_SEAT_INDEX] = {
      ...waitingRoomState.players[DEFAULT_HOST_SEAT_INDEX],
      name: resolvePlayerName(request.playerName, DEFAULT_HOST_SEAT_INDEX),
    };
    const room: RoomRecord = {
      activeSeatIndices: undefined,
      authenticatedSeats: [],
      createdAt,
      expiresAt: createExpiryTimestamp(createdAt),
      hostSeatIndex: DEFAULT_HOST_SEAT_INDEX,
      roomCode,
      seatCapacity: DEFAULT_SEAT_CAPACITY,
      seatTokenHashes: [
        hashSeatToken(seatToken),
        ...Array<string | null>(DEFAULT_SEAT_CAPACITY - 1).fill(null),
      ],
      state: waitingRoomState,
      status: 'WAITING',
      summary: null,
      updatedAt: createdAt,
      version: 1,
    };

    try {
      await dependencies.roomRepository.create(room);

      return buildRoomSession(room, DEFAULT_HOST_SEAT_INDEX, seatToken, dependencies.websocketUrl);
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

  for (let attempt = 0; attempt < ROOM_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    const room = await dependencies.roomRepository.get(roomCode);

    if (!room) {
      throw new ClientError('Room not found', 404);
    }

    if (room.status !== 'WAITING') {
      throw new ClientError('Room already started', 409);
    }

    const openSeatIndex = getFirstOpenSeatIndex(room);
    if (openSeatIndex < 0) {
      throw new ClientError('Room is full', 409);
    }

    const seatToken = createSeatToken();
    const seatTokenHashes = [...room.seatTokenHashes];
    seatTokenHashes[openSeatIndex] = hashSeatToken(seatToken);
    const nextPlayers = room.state.players.map((player, playerIndex) => (
      playerIndex === openSeatIndex
        ? {
            ...player,
            name: resolvePlayerName(request.playerName, openSeatIndex),
          }
        : player
    ));
    const updatedRoom = buildUpdatedRoom(room, {
      seatTokenHashes,
      state: {
        ...room.state,
        players: nextPlayers,
      },
      version: room.version + 1,
    });

    try {
      await dependencies.roomRepository.update(updatedRoom, room.version);
      return buildRoomSession(updatedRoom, openSeatIndex, seatToken, dependencies.websocketUrl);
    } catch (error) {
      if (!isRoomVersionConflictError(error) || attempt === ROOM_UPDATE_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error('Unable to join room');
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

  if (input.seatIndex < 0 || input.seatIndex >= room.seatTokenHashes.length) {
    throw new ClientError('Invalid seat token', 401);
  }

  const expectedHash = room.seatTokenHashes[input.seatIndex];

  if (!expectedHash || expectedHash !== hashSeatToken(input.seatToken)) {
    throw new ClientError('Invalid seat token', 401);
  }

  if (room.status !== 'WAITING' && room.activeSeatIndices && !room.activeSeatIndices.includes(input.seatIndex)) {
    throw new ClientError('Seat is not active in this room', 409);
  }

  const now = new Date().toISOString();
  await dependencies.connectionRepository.put({
    connectedAt: now,
    connectionId: input.connectionId,
    roomCode: room.roomCode,
    seatIndex: input.seatIndex,
    updatedAt: now,
  });

  for (let attempt = 0; attempt < ROOM_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    const currentRoom = await dependencies.roomRepository.get(normalizeRoomCode(input.roomCode));

    if (!currentRoom) {
      throw new ClientError('Room not found', 404);
    }

    if (currentRoom.status !== 'WAITING' && currentRoom.activeSeatIndices && !currentRoom.activeSeatIndices.includes(input.seatIndex)) {
      throw new ClientError('Seat is not active in this room', 409);
    }

    const existingConnections = await dependencies.connectionRepository.listByRoomCode(currentRoom.roomCode);
    const connectedSeats = [...new Set([...getConnectedSeats(existingConnections), input.seatIndex])].sort((left, right) => left - right);
    const authenticatedSeats = [...new Set([...getAuthenticatedSeats(currentRoom), input.seatIndex])].sort((left, right) => left - right);
    const updatedRoom = buildUpdatedRoom(currentRoom, {
      authenticatedSeats,
      version: currentRoom.version + 1,
    });

    try {
      await dependencies.roomRepository.update(updatedRoom, currentRoom.version);
      await broadcastPresence(dependencies, updatedRoom, connectedSeats);
      await broadcastSnapshots(dependencies, updatedRoom, connectedSeats);
      return;
    } catch (error) {
      if (!isRoomVersionConflictError(error) || attempt === ROOM_UPDATE_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }
};

export const startGame = async (
  dependencies: RoomServiceDependencies,
  input: {
    connectionId: string;
  },
): Promise<void> => {
  const connection = await getAuthenticatedConnection(dependencies, input.connectionId);

  for (let attempt = 0; attempt < ROOM_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    const room = await dependencies.roomRepository.get(connection.roomCode);

    if (!room) {
      throw new ClientError('Room not found', 404);
    }

    if (room.status !== 'WAITING') {
      throw new ClientError('Room already started', 409);
    }

    if (connection.seatIndex !== room.hostSeatIndex) {
      throw new ClientError('Only the host can start the room', 403);
    }

    const connectedSeats = getAuthenticatedSeats(room);

    if (connectedSeats.length < 2) {
      throw new ClientError('At least two connected players are required to start', 409);
    }

    const nextState = createOnlineInitialGameState({
      playerCount: connectedSeats.length,
      playerNames: connectedSeats.map((seatIndex) => room.state.players[seatIndex]?.name),
      seatIndices: connectedSeats,
      stockSize: room.state.config.STOCK_SIZE,
    });
    const nextRoom = buildUpdatedRoom(room, {
      activeSeatIndices: connectedSeats,
      state: nextState,
      status: 'ACTIVE',
      version: room.version + 1,
    });

    try {
      await dependencies.roomRepository.update(nextRoom, room.version);
      await broadcastPresence(dependencies, nextRoom, connectedSeats);
      await broadcastSnapshots(dependencies, nextRoom, connectedSeats);
      return;
    } catch (error) {
      if (!isRoomVersionConflictError(error) || attempt === ROOM_UPDATE_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }
};

export const handleAction = async (
  dependencies: RoomServiceDependencies,
  input: {
    action: GameAction;
    connectionId: string;
  },
): Promise<void> => {
  const connection = await getAuthenticatedConnection(dependencies, input.connectionId);

  for (let attempt = 0; attempt < ROOM_UPDATE_MAX_ATTEMPTS; attempt += 1) {
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

    const playerIndex = getViewerPlayerIndex(room, connection.seatIndex);

    if (playerIndex < 0) {
      throw new ClientError('Seat is not active in this room', 409);
    }

    if (room.state.currentPlayerIndex !== playerIndex && !isDebugAction(input.action)) {
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

    try {
      await dependencies.roomRepository.update(nextRoom, room.version);
      await broadcastSnapshots(dependencies, nextRoom);
      await broadcastPresence(dependencies, nextRoom);
      return;
    } catch (error) {
      if (!isRoomVersionConflictError(error) || attempt === ROOM_UPDATE_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }
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

  for (let attempt = 0; attempt < ROOM_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    const currentRoom = await dependencies.roomRepository.get(connection.roomCode);

    if (!currentRoom) {
      return;
    }

    const authenticatedSeats = getAuthenticatedSeats(currentRoom).filter((seatIndex) => seatIndex !== connection.seatIndex);
    const updatedRoom = buildUpdatedRoom(currentRoom, {
      authenticatedSeats,
      version: currentRoom.version + 1,
    });

    try {
      await dependencies.roomRepository.update(updatedRoom, currentRoom.version);
      await broadcastPresence(dependencies, updatedRoom);
      return;
    } catch (error) {
      if (!isRoomVersionConflictError(error) || attempt === ROOM_UPDATE_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }
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
