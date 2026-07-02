import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameConfig, GameState } from '@skipbo/game-core';
import type { GameStatsRecord, GameStatsSnapshot } from '@/monitoring/gameStats';

// Capture the snapshot the screen feeds the recorder each render, so we can
// assert the online recording gate (placeholder window vs. real view). The
// record it returns is controllable so tests can simulate the host's tracker
// finalizing a game.
const recorderCalls: (GameStatsSnapshot | null)[] = [];
let recorderLastRecord: GameStatsRecord | null = null;
vi.mock('@/hooks/useGameStatsRecorder', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useGameStatsRecorder')>('@/hooks/useGameStatsRecorder');
  return {
    ...actual,
    useGameStatsRecorder: (snapshot: GameStatsSnapshot | null) => {
      recorderCalls.push(snapshot);
      return { lastRecord: recorderLastRecord };
    },
  };
});

// Stub the online hook so we can drive room status / view availability.
const onlineHook = vi.fn();
vi.mock('@/hooks/useOnlineSkipBoGame', () => ({ useOnlineSkipBoGame: () => onlineHook() }));
vi.mock('@/hooks/useLocalSkipBoGame', () => ({
  useLocalSkipBoGame: () => ({ gameState: makeGameState() }),
}));

vi.mock('@/state/gameStatsHistory', () => ({ appendGameStatsRecord: vi.fn() }));

// Heavy children are irrelevant to the recording gate — render nothing, but
// capture the props each render so the stats-related ones can be asserted.
const appShellCalls: Array<{ statsRecord?: GameStatsRecord | null }> = [];
vi.mock('@/components/AppShell', () => ({
  AppShell: (props: { statsRecord?: GameStatsRecord | null }) => {
    appShellCalls.push(props);
    return null;
  },
}));
vi.mock('@/components/DebugStrip', () => ({ DebugStrip: () => null }));
vi.mock('@/components/LobbyDialog', () => ({ LobbyDialog: () => null, LobbyRemovedDialog: () => null }));
vi.mock('@/components/OnlineGameBoard', () => ({ OnlineGameBoard: () => null }));
vi.mock('@/components/LocalGameBoard', () => ({ LocalGameBoard: () => null }));
vi.mock('@/components/OnlineStatusStrip', () => ({ OnlineStatusStrip: () => null }));

import OnlineGameScreen from '@/components/OnlineGameScreen';

function makeGameState(playerCount = 3): GameState {
  return {
    deck: [],
    buildPiles: [[], [], [], []],
    completedBuildPiles: [],
    players: Array.from({ length: playerCount }, (_, index) => ({
      isAI: index !== 0,
      stockPile: [],
      hand: [null, null, null, null, null],
      discardPiles: [[], [], [], []],
    })),
    currentPlayerIndex: 0,
    gameIsOver: false,
    winnerIndex: null,
    selectedCard: null,
    message: { code: 'SELECT_CARD' },
    config: { STOCK_SIZE: 30 } as GameConfig,
  } as GameState;
}

const baseHookReturn = () => ({
  broadcastGameStats: vi.fn(),
  canStartGame: false,
  clearSelection: vi.fn(),
  connectedSeats: [],
  connectionStatus: 'connected',
  debugFillBuildPile: vi.fn(),
  debugFillHandSkipBo: vi.fn(),
  debugClearStockPile: vi.fn(),
  debugClearAiStockPile: vi.fn(),
  debugWin: vi.fn(),
  discardCard: vi.fn(),
  disconnectedSeats: [],
  gameState: makeGameState(),
  hasGameView: false,
  isLocalHost: true,
  kickSeat: vi.fn(),
  leaveLobby: vi.fn(),
  lobbySeats: [],
  myReadyState: 'never-ready',
  playCard: vi.fn(),
  playersBySeatIndex: {},
  receivedGameStats: null,
  roomCode: 'ABCD',
  roomStatus: 'ACTIVE',
  seatCapacity: 4,
  selectCard: vi.fn(),
  sendSetReady: vi.fn(),
  sendSetUnready: vi.fn(),
  startGame: vi.fn(),
  lobbyRemovalReason: null,
});

const screenProps = {
  applyUpdateWhenSafe: vi.fn(),
  isApplyingUpdate: false,
  isUpdatePending: false,
  onJoinOnlineGame: vi.fn(),
  onLeaveSession: vi.fn(),
  onReplay: vi.fn(),
  onStartLocalGame: vi.fn(),
  onStartOnlineGame: vi.fn(),
  onUpdateNow: vi.fn(),
  session: { seatIndex: 0, roomCode: 'ABCD', seatCapacity: 4, hostSeatIndex: 0 },
  updateNotice: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

afterEach(() => {
  recorderCalls.length = 0;
  recorderLastRecord = null;
  appShellCalls.length = 0;
  vi.clearAllMocks();
});

describe('OnlineGameScreen stats gate', () => {
  it('feeds no snapshot while the game is on the placeholder (no view yet)', () => {
    onlineHook.mockReturnValue({ ...baseHookReturn(), roomStatus: 'ACTIVE', hasGameView: false });
    render(<OnlineGameScreen {...screenProps} />);
    expect(recorderCalls.at(-1)).toBeNull();
  });

  it('feeds a real snapshot once the game view has been ingested', () => {
    onlineHook.mockReturnValue({ ...baseHookReturn(), roomStatus: 'ACTIVE', hasGameView: true });
    render(<OnlineGameScreen {...screenProps} />);
    expect(recorderCalls.at(-1)).toMatchObject({ players: expect.any(Array) });
    expect(recorderCalls.at(-1)?.players).toHaveLength(3);
  });

  it('feeds no snapshot for a guest, even once the game view has been ingested', () => {
    // Only the host's tracker is trustworthy (no network delay); a guest must
    // rely solely on the host-broadcast record, never self-track.
    onlineHook.mockReturnValue({
      ...baseHookReturn(),
      isLocalHost: false,
      roomStatus: 'ACTIVE',
      hasGameView: true,
    });
    render(<OnlineGameScreen {...screenProps} />);
    expect(recorderCalls.at(-1)).toBeNull();
  });
});

describe('OnlineGameScreen pending-update safe gate', () => {
  it('does not auto-apply while the lobby is open (the room code is being shared)', () => {
    onlineHook.mockReturnValue({ ...baseHookReturn(), roomStatus: 'WAITING' });
    render(<OnlineGameScreen {...screenProps} isUpdatePending />);
    expect(screenProps.applyUpdateWhenSafe).not.toHaveBeenCalled();
  });

  it("auto-applies during an opponent's turn in an active game", () => {
    onlineHook.mockReturnValue({
      ...baseHookReturn(),
      roomStatus: 'ACTIVE',
      gameState: { ...makeGameState(), currentPlayerIndex: 1 },
    });
    render(<OnlineGameScreen {...screenProps} isUpdatePending />);
    expect(screenProps.applyUpdateWhenSafe).toHaveBeenCalled();
  });

  it("does not auto-apply during the local player's turn", () => {
    onlineHook.mockReturnValue({ ...baseHookReturn(), roomStatus: 'ACTIVE' });
    render(<OnlineGameScreen {...screenProps} isUpdatePending />);
    expect(screenProps.applyUpdateWhenSafe).not.toHaveBeenCalled();
  });

  it('does not auto-apply on a finished game (victory screen stays up)', () => {
    onlineHook.mockReturnValue({
      ...baseHookReturn(),
      roomStatus: 'FINISHED',
      gameState: { ...makeGameState(), currentPlayerIndex: 1, gameIsOver: true, winnerIndex: 1 },
    });
    render(<OnlineGameScreen {...screenProps} isUpdatePending />);
    expect(screenProps.applyUpdateWhenSafe).not.toHaveBeenCalled();
  });
});

describe('OnlineGameScreen stats broadcast/receive', () => {
  const statsRecord: GameStatsRecord = {
    id: 'game-1',
    schemaVersion: 1,
    appVersion: 'vTEST',
    mode: 'online',
    startedAt: '2026-04-05T12:00:00.000Z',
    endedAt: '2026-04-05T12:10:00.000Z',
    durationMs: 600_000,
    totalTurns: 12,
    playerCount: 2,
    stockSize: 10,
    winnerIndex: 0,
    winnerName: 'Alice',
    winnerIsAI: false,
    players: [],
  };

  it('broadcasts the host tracker record once it finalizes and displays it', async () => {
    recorderLastRecord = statsRecord;
    const broadcastGameStats = vi.fn();
    onlineHook.mockReturnValue({
      ...baseHookReturn(),
      broadcastGameStats,
      isLocalHost: true,
      roomStatus: 'FINISHED',
      hasGameView: true,
    });

    render(<OnlineGameScreen {...screenProps} />);

    expect(broadcastGameStats).toHaveBeenCalledWith(statsRecord);
    expect(appShellCalls.at(-1)?.statsRecord).toBe(statsRecord);
  });

  it('displays and persists the host-broadcast record for a guest, without broadcasting', async () => {
    const { appendGameStatsRecord } = await import('@/state/gameStatsHistory');
    const broadcastGameStats = vi.fn();
    onlineHook.mockReturnValue({
      ...baseHookReturn(),
      broadcastGameStats,
      isLocalHost: false,
      receivedGameStats: statsRecord,
      roomStatus: 'FINISHED',
      hasGameView: true,
    });

    render(<OnlineGameScreen {...screenProps} />);

    expect(broadcastGameStats).not.toHaveBeenCalled();
    expect(appendGameStatsRecord).toHaveBeenCalledWith(statsRecord);
    expect(appShellCalls.at(-1)?.statsRecord).toBe(statsRecord);
  });
});
