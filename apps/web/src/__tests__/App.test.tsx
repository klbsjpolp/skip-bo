import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameConfig, GameState } from '@/types';

// Controllable stand-in for the version gate so tests can flip pending/hard
// update states and observe what the start handlers do with reloadToUpdate.
const versionGate = {
  applyUpdateOnceForCurrentTarget: vi.fn(),
  currentAppVersion: 'v1.0.0',
  dismissJustUpdated: vi.fn(),
  dismissSoftUpdate: vi.fn(),
  hasPendingServiceWorkerUpdate: false,
  isApplyingUpdate: false,
  isHardUpdateRequired: false,
  isUpdatePending: false,
  justUpdatedFromVersion: null as string | null,
  lastCheckAt: null,
  latestAppVersion: null,
  minimumSupportedVersion: null as string | null,
  reloadToUpdate: vi.fn<() => Promise<boolean>>(),
  shouldShowSoftUpdate: false,
};
vi.mock('@/hooks/usePwaVersionGate', () => ({
  usePwaVersionGate: () => ({ ...versionGate }),
}));

const createOnlineRoomMock = vi.fn();
const joinOnlineRoomMock = vi.fn();
vi.mock('@/online/api', () => ({
  createOnlineRoom: (...args: unknown[]) => createOnlineRoomMock(...args),
  joinOnlineRoom: (...args: unknown[]) => joinOnlineRoomMock(...args),
}));

vi.mock('@/state/sessionPersistence', () => ({
  clearOnlineSession: vi.fn(),
  loadOnlineSession: () => null,
  saveOnlineSession: vi.fn(),
}));

function makeGameState(): GameState {
  return {
    deck: [],
    buildPiles: [[], [], [], []],
    completedBuildPiles: [],
    players: Array.from({ length: 2 }, (_, index) => ({
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

vi.mock('@/hooks/useLocalSkipBoGame', () => ({
  useLocalSkipBoGame: () => ({
    clearSelection: vi.fn(),
    debugFillBuildPile: vi.fn(),
    debugFillHandSkipBo: vi.fn(),
    debugClearStockPile: vi.fn(),
    debugClearAiStockPile: vi.fn(),
    debugWin: vi.fn(),
    discardCard: vi.fn(),
    gameState: makeGameState(),
    playCard: vi.fn(),
    selectCard: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGameStatsRecorder', () => ({
  buildGameStatsSnapshot: () => null,
  useGameStatsRecorder: () => ({ lastRecord: null }),
}));

vi.mock('@/contexts/useCardAnimation', () => ({
  useCardAnimation: () => ({ waitForAnimations: vi.fn() }),
}));

vi.mock('@/hooks/useThemeColorMeta', () => ({ useThemeColorMeta: () => undefined }));
vi.mock('@/hooks/useThemeUsageReporter', () => ({ useThemeUsageReporter: () => undefined }));

// Presentational children are irrelevant here — render nothing, but capture the
// AppShell props each render so the session handlers can be driven directly.
interface CapturedShellProps {
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onStartLocalGame: () => void;
  onUpdateNow?: () => void;
}
const appShellCalls: CapturedShellProps[] = [];
vi.mock('@/components/AppShell', () => ({
  AppShell: (props: CapturedShellProps) => {
    appShellCalls.push(props);
    return null;
  },
}));
const onlineScreenCalls: unknown[] = [];
vi.mock('@/components/OnlineGameScreen', () => ({
  default: (props: unknown) => {
    onlineScreenCalls.push(props);
    return null;
  },
}));
vi.mock('@/components/LocalGameBoard', () => ({ LocalGameBoard: () => null }));
vi.mock('@/components/DebugStrip', () => ({ DebugStrip: () => null }));
vi.mock('@/components/AppUpdatedBanner', () => ({ AppUpdatedBanner: () => null }));
vi.mock('@/components/ResumeGameBanner', () => ({ ResumeGameBanner: () => null }));
vi.mock('@/components/ForcedUpdateOverlay', () => ({ ForcedUpdateOverlay: () => null }));

import App from '@/App';

const lastShellProps = () => {
  const props = appShellCalls.at(-1);
  if (!props) throw new Error('AppShell never rendered');
  return props;
};

const session = { roomCode: 'ABCD', seatIndex: 0, seatToken: 'token', seatCapacity: 4, hostSeatIndex: 0 };

beforeEach(() => {
  versionGate.isHardUpdateRequired = false;
  versionGate.isUpdatePending = false;
  versionGate.reloadToUpdate.mockResolvedValue(false);
  createOnlineRoomMock.mockResolvedValue(session);
  joinOnlineRoomMock.mockResolvedValue(session);
});

afterEach(() => {
  appShellCalls.length = 0;
  onlineScreenCalls.length = 0;
  vi.clearAllMocks();
});

describe('App online start handlers and pending updates', () => {
  it('creates the room when no update is pending', async () => {
    render(<App />);

    await act(async () => {
      await lastShellProps().onStartOnlineGame();
    });

    expect(versionGate.reloadToUpdate).not.toHaveBeenCalled();
    expect(createOnlineRoomMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onlineScreenCalls.length).toBeGreaterThan(0);
    });
  });

  it('applies a pending update and aborts the start when the reload commits', async () => {
    versionGate.isUpdatePending = true;
    versionGate.reloadToUpdate.mockResolvedValue(true);

    render(<App />);

    await act(async () => {
      await lastShellProps().onStartOnlineGame();
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalled();
    expect(createOnlineRoomMock).not.toHaveBeenCalled();
    expect(onlineScreenCalls).toHaveLength(0);
  });

  it('still creates the room when the pending update has no staged worker (reload no-op)', async () => {
    versionGate.isUpdatePending = true;
    versionGate.reloadToUpdate.mockResolvedValue(false);

    render(<App />);

    await act(async () => {
      await lastShellProps().onStartOnlineGame();
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalled();
    expect(createOnlineRoomMock).toHaveBeenCalledTimes(1);
  });

  it('applies a deferred hard update instead of contacting the server', async () => {
    versionGate.isHardUpdateRequired = true;

    render(<App />);

    await act(async () => {
      await lastShellProps().onStartOnlineGame();
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalled();
    expect(createOnlineRoomMock).not.toHaveBeenCalled();
  });

  it('applies a deferred hard update instead of joining a room', async () => {
    versionGate.isHardUpdateRequired = true;

    render(<App />);

    await act(async () => {
      await lastShellProps().onJoinOnlineGame('ABCD');
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalled();
    expect(joinOnlineRoomMock).not.toHaveBeenCalled();
  });

  it('applies a deferred hard update instead of starting a fresh local game', async () => {
    versionGate.isHardUpdateRequired = true;

    render(<App />);
    versionGate.reloadToUpdate.mockClear();

    act(() => {
      lastShellProps().onStartLocalGame();
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalledTimes(1);
  });

  it('gates joining a room on the pending update the same way as creating one', async () => {
    versionGate.isUpdatePending = true;
    versionGate.reloadToUpdate.mockResolvedValue(true);

    render(<App />);

    await act(async () => {
      await lastShellProps().onJoinOnlineGame('ABCD');
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalled();
    expect(joinOnlineRoomMock).not.toHaveBeenCalled();
  });

  it('joins the room once the pending update turns out to be a no-op', async () => {
    versionGate.isUpdatePending = true;
    versionGate.reloadToUpdate.mockResolvedValue(false);

    render(<App />);

    await act(async () => {
      await lastShellProps().onJoinOnlineGame('ABCD');
    });

    expect(joinOnlineRoomMock).toHaveBeenCalledWith('ABCD');
    await waitFor(() => {
      expect(onlineScreenCalls.length).toBeGreaterThan(0);
    });
  });

  it('fires a fire-and-forget reload from the update-now callback', async () => {
    render(<App />);

    act(() => {
      lastShellProps().onUpdateNow?.();
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalledTimes(1);
  });

  it('fires the reload alongside starting a fresh local game while an update is pending', async () => {
    versionGate.isUpdatePending = true;

    render(<App />);
    versionGate.applyUpdateOnceForCurrentTarget.mockClear();
    versionGate.reloadToUpdate.mockClear();

    act(() => {
      lastShellProps().onStartLocalGame();
    });

    expect(versionGate.reloadToUpdate).toHaveBeenCalledTimes(1);
    // The local start is not aborted — a lagging service worker must not leave
    // the "New Game" button stuck.
    expect(appShellCalls.length).toBeGreaterThan(0);
  });
});
