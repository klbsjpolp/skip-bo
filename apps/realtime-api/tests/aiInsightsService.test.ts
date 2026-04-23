import {afterEach, describe, expect, it, vi} from 'vitest';

import {RoomVersionConflictError, type ConnectionRecord, type ConnectionRepository, type RoomRecord, type RoomRepository} from '../src/repositories/types.js';
import type {RealtimeBroadcaster} from '../src/services/broadcaster.js';
import type {GenAiLineInput, GenAiProvider} from '../src/services/genAiProvider.js';
import {
  requestAiCoach,
  requestAiPostGameSummary,
  requestLocalAiCoach,
  requestLocalAiPostGameSummary,
} from '../src/services/aiInsightsService.js';
import {authenticateConnection, createRoom, joinRoom, startGame} from '../src/services/roomService.js';

class InMemoryRoomRepository implements RoomRepository {
  readonly rooms = new Map<string, RoomRecord>();

  async create(room: RoomRecord): Promise<void> {
    this.rooms.set(room.roomCode, room);
  }

  async get(roomCode: string): Promise<RoomRecord | null> {
    return this.rooms.get(roomCode) ?? null;
  }

  async update(room: RoomRecord, expectedVersion?: number): Promise<void> {
    const currentRoom = this.rooms.get(room.roomCode);

    if (expectedVersion !== undefined && currentRoom && currentRoom.version !== expectedVersion) {
      throw new RoomVersionConflictError(room.roomCode);
    }

    this.rooms.set(room.roomCode, room);
  }
}

class InMemoryConnectionRepository implements ConnectionRepository {
  readonly connections = new Map<string, ConnectionRecord>();

  async delete(connectionId: string): Promise<void> {
    this.connections.delete(connectionId);
  }

  async get(connectionId: string): Promise<ConnectionRecord | null> {
    return this.connections.get(connectionId) ?? null;
  }

  async listByRoomCode(roomCode: string): Promise<ConnectionRecord[]> {
    return [...this.connections.values()].filter((connection) => connection.roomCode === roomCode);
  }

  async put(record: ConnectionRecord): Promise<void> {
    this.connections.set(record.connectionId, record);
  }
}

class FakeBroadcaster implements RealtimeBroadcaster {
  async send(): Promise<void> {
    return undefined;
  }
}

class CapturingProvider implements GenAiProvider {
  readonly generateLine = vi.fn(async (input: GenAiLineInput) => {
    this.inputs.push(input);
    return 'Coach: joue le 1 de ton talon vers la pile 1.';
  });

  readonly inputs: GenAiLineInput[] = [];
}

const createDependencies = () => ({
  broadcaster: new FakeBroadcaster(),
  connectionRepository: new InMemoryConnectionRepository(),
  roomRepository: new InMemoryRoomRepository(),
  websocketUrl: 'wss://example.test/ws',
});

const createActiveRoom = async () => {
  const dependencies = createDependencies();
  const created = await createRoom(dependencies, {stockSize: 5});
  const joined = await joinRoom(dependencies, {roomCode: created.roomCode});

  await authenticateConnection(dependencies, {
    connectionId: 'c-0',
    roomCode: created.roomCode,
    seatIndex: created.seatIndex,
    seatToken: created.seatToken,
  });
  await authenticateConnection(dependencies, {
    connectionId: 'c-1',
    roomCode: joined.roomCode,
    seatIndex: joined.seatIndex,
    seatToken: joined.seatToken,
  });
  await startGame(dependencies, {connectionId: 'c-0'});

  const room = await dependencies.roomRepository.get(created.roomCode);

  if (!room) {
    throw new Error('Expected room');
  }

  const nextRoom: RoomRecord = {
    ...room,
    state: {
      ...room.state,
      buildPiles: [[], [], [], []],
      currentPlayerIndex: 0,
      deck: [],
      players: room.state.players.map((player, playerIndex) => ({
        ...player,
        discardPiles: player.discardPiles.map(() => []),
        hand: playerIndex === 0
          ? [
              {value: 4, isSkipBo: false},
              null,
              null,
              null,
              null,
            ]
          : [
              {value: 11, isSkipBo: false},
              {value: 12, isSkipBo: false},
              {value: 11, isSkipBo: false},
              {value: 12, isSkipBo: false},
              {value: 11, isSkipBo: false},
            ],
        stockPile: playerIndex === 0 ? [{value: 1, isSkipBo: false}] : [],
      })),
      selectedCard: null,
    },
  };

  await dependencies.roomRepository.update(nextRoom);

  return {
    created,
    dependencies,
    joined,
  };
};

describe('AI insights service', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses coach requests with an invalid seat token', async () => {
    const {created, dependencies} = await createActiveRoom();

    await expect(requestAiCoach({
      genAiProvider: null,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: 'wrong-token',
    })).rejects.toThrow('Invalid seat token');
  });

  it('refuses coach requests when it is not the local player turn', async () => {
    const {dependencies, joined} = await createActiveRoom();

    await expect(requestAiCoach({
      genAiProvider: null,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: joined.roomCode,
      seatIndex: joined.seatIndex,
      seatToken: joined.seatToken,
    })).rejects.toThrow('It is not your turn');
  });

  it('builds coach prompts from the redacted viewer state', async () => {
    const {created, dependencies} = await createActiveRoom();
    const provider = new CapturingProvider();

    const response = await requestAiCoach({
      genAiProvider: provider,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    expect(response.displayText).toBe('Coach: joue le 1 de ton talon vers la pile 1.');
    expect(response.fallbackUsed).toBe(false);
    expect(response.recommendation).toMatchObject({
      action: 'play',
      source: 'stock',
    });
    expect(provider.inputs[0]?.prompt).not.toContain('"value":11');
    expect(provider.inputs[0]?.prompt).not.toContain('"value":12');
  });

  it('surfaces missing provider failures outside production', async () => {
    const {created, dependencies} = await createActiveRoom();

    vi.stubEnv('NODE_ENV', 'development');

    await expect(requestAiCoach({
      genAiProvider: null,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    })).rejects.toThrow('No Gen AI provider is configured');
  });

  it('falls back to deterministic coach text and captures the error in production when the provider fails', async () => {
    const {created, dependencies} = await createActiveRoom();
    const captureException = vi.fn();
    const provider: GenAiProvider = {
      generateLine: vi.fn(async () => {
        throw new Error('provider unavailable');
      }),
    };

    vi.stubEnv('NODE_ENV', 'production');

    const response = await requestAiCoach({
      captureException,
      genAiProvider: provider,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    expect(response.fallbackUsed).toBe(true);
    expect(response.displayText).toContain('Coach: joue le 1');
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      handler: 'ai-coach',
      route: 'POST /ai/coach',
      transport: 'http',
    });
  });

  it('refuses post-game summaries before the room is finished', async () => {
    const {created, dependencies} = await createActiveRoom();

    await expect(requestAiPostGameSummary({
      genAiProvider: null,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    })).rejects.toThrow('Room is not finished');
  });

  it('returns a bounded fallback post-game summary for finished rooms', async () => {
    const {created, dependencies} = await createActiveRoom();
    const room = await dependencies.roomRepository.get(created.roomCode);

    if (!room) {
      throw new Error('Expected room');
    }

    await dependencies.roomRepository.update({
      ...room,
      actionLog: [{
        action: 'play',
        buildPileIndex: 0,
        card: {value: 1, isSkipBo: false},
        playerIndex: 0,
        seatIndex: 0,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 0,
        stockCountBefore: 1,
        version: room.version + 1,
      }],
      state: {
        ...room.state,
        gameIsOver: true,
        winnerIndex: 0,
      },
      status: 'FINISHED',
      version: room.version + 1,
    });

    vi.stubEnv('NODE_ENV', 'production');

    const response = await requestAiPostGameSummary({
      genAiProvider: null,
      roomRepository: dependencies.roomRepository,
    }, {
      roomCode: created.roomCode,
      seatIndex: created.seatIndex,
      seatToken: created.seatToken,
    });

    expect(response.fallbackUsed).toBe(true);
    expect(response.displayText).toContain('Résumé: victoire');
    expect(response.displayText.length).toBeLessThanOrEqual(140);
  });

  it('builds local coach prompts without room state', async () => {
    const provider = new CapturingProvider();

    const response = await requestLocalAiCoach({
      genAiProvider: provider,
    }, {
      localVersion: 2,
      recommendation: {
        action: 'play',
        buildPileIndex: 0,
        card: {value: 1, isSkipBo: false},
        reasonCodes: ['play-stock'],
        score: 1001,
        source: 'stock',
        sourceIndex: 0,
      },
    });

    expect(response).toMatchObject({
      displayText: 'Coach: joue le 1 de ton talon vers la pile 1.',
      fallbackUsed: false,
      localVersion: 2,
    });
    expect(provider.inputs[0]?.prompt).toContain('"recommendation"');
    expect(provider.inputs[0]?.prompt).not.toContain('"deck"');
    expect(provider.inputs[0]?.prompt).not.toContain('"players"');
  });

  it('falls back and captures local coach provider errors in production', async () => {
    const captureException = vi.fn();
    const provider: GenAiProvider = {
      generateLine: vi.fn(async () => {
        throw new Error('provider unavailable');
      }),
    };

    vi.stubEnv('NODE_ENV', 'production');

    const response = await requestLocalAiCoach({
      captureException,
      genAiProvider: provider,
    }, {
      localVersion: 1,
      recommendation: {
        action: 'play',
        buildPileIndex: 0,
        card: {value: 1, isSkipBo: false},
        reasonCodes: ['play-stock'],
        score: 1001,
        source: 'stock',
        sourceIndex: 0,
      },
    });

    expect(response.fallbackUsed).toBe(true);
    expect(response.displayText).toContain('Coach: joue le 1');
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      handler: 'ai-local-coach',
      route: 'POST /ai/local/coach',
      transport: 'http',
    });
  });

  it('surfaces local provider failures outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    await expect(requestLocalAiCoach({
      genAiProvider: null,
    }, {
      recommendation: {
        action: 'end',
        reasonCodes: ['no-legal-move'],
        score: 0,
      },
    })).rejects.toThrow('No Gen AI provider is configured');
  });

  it('builds local summary prompts from bounded visible action data', async () => {
    const provider: GenAiProvider = {
      generateLine: vi.fn(async () => 'Résumé: texte serveur amélioré.'),
    };

    const response = await requestLocalAiPostGameSummary({
      genAiProvider: provider,
    }, {
      actionLog: [{
        action: 'play',
        buildPileIndex: 0,
        card: {value: 1, isSkipBo: false},
        playerIndex: 0,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 0,
        stockCountBefore: 1,
        version: 1,
      }],
      localVersion: 1,
      playerIndex: 0,
      winnerIndex: 0,
    });

    expect(response).toEqual({
      displayText: 'Résumé: texte serveur amélioré.',
      fallbackUsed: false,
      localVersion: 1,
    });
    expect(provider.generateLine).toHaveBeenCalledWith(expect.objectContaining({
      task: 'summary',
    }));
  });
});
