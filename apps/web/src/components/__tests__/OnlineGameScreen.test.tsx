import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameConfig, GameState } from '@/types';
import type { GameStatsSnapshot } from '@/monitoring/gameStats';

// Capture the snapshot the screen feeds the recorder each render, so we can
// assert the online recording gate (placeholder window vs. real view).
const recorderCalls: (GameStatsSnapshot | null)[] = [];
vi.mock('@/hooks/useGameStatsRecorder', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useGameStatsRecorder')>('@/hooks/useGameStatsRecorder');
  return {
    ...actual,
    useGameStatsRecorder: (snapshot: GameStatsSnapshot | null) => {
      recorderCalls.push(snapshot);
      return { lastRecord: null };
    },
  };
});

// Stub the online hook so we can drive room status / view availability.
const onlineHook = vi.fn();
vi.mock('@/hooks/useOnlineSkipBoGame', () => ({ useOnlineSkipBoGame: () => onlineHook() }));
vi.mock('@/hooks/useLocalSkipBoGame', () => ({
  useLocalSkipBoGame: () => ({ gameState: makeGameState() }),
}));

// Heavy children are irrelevant to the recording gate — render nothing.
vi.mock('@/components/AppShell', () => ({ AppShell: () => null }));
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
    message: '',
    config: { STOCK_SIZE: 30 } as GameConfig,
  } as GameState;
}

const baseHookReturn = () => ({
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
});
