import { type ReactNode, useEffect, useState } from 'react';

import type { CreateRoomResponse } from '@klbsjpolp/realtime-core';

import { useLocalSkipBoGame } from '@/hooks/useLocalSkipBoGame';
import { useOnlineSkipBoGame } from '@/hooks/useOnlineSkipBoGame';
import type { GameType } from '@/app/types';
import { AppUpdatedBanner } from '@/components/AppUpdatedBanner';
import { ForcedUpdateOverlay } from '@/components/ForcedUpdateOverlay';
import { LobbyDialog, LobbyRemovedDialog } from '@/components/LobbyDialog';
import { OnlineStatusStrip } from '@/components/OnlineStatusStrip';
import { ResumeGameBanner } from '@/components/ResumeGameBanner';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LocalGameBoard } from '@/components/LocalGameBoard';
import { OnlineGameBoard } from '@/components/OnlineGameBoard';
import { Button } from '@/components/ui/button';
import NewGame from '@/components/NewGame';
import { useCardAnimation } from '@/contexts/useCardAnimation';
import { animationServiceBridge } from '@/lib/animationServiceBridge';
import { APP_VERSION } from '@/lib/appVersion';
import { canPlayCard } from '@/lib/validators';
import { createOnlineRoom, joinOnlineRoom } from '@/online/api';
import { getStoredStockSize } from '@/state/initialGameState';
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from '@/state/sessionPersistence';
import { getRequestedUiFixtureName, getUiFixture, type UiFixtureName } from '@/testing/uiFixtures';
import { DebugStrip } from '@/components/DebugStrip';
import { usePwaVersionGate } from '@/hooks/usePwaVersionGate';
import { useThemeColorMeta } from '@/hooks/useThemeColorMeta';
import { useThemeUsageGameGate, useThemeUsageReporter } from '@/hooks/useThemeUsageReporter';

const fixtureActionResult = Promise.resolve({ success: true, message: 'Fixture mode' });

interface AppShellProps {
  debugStrip?: ReactNode;
  fixtureName?: UiFixtureName;
  gameBoard: ReactNode;
  isGameOver: boolean;
  isUpdatePending?: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void> | void;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  statusStrip?: ReactNode;
  updateNotice?: ReactNode;
}

function AppShell({
  debugStrip,
  fixtureName,
  gameBoard,
  isGameOver,
  isUpdatePending = false,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  statusStrip,
  updateNotice,
}: AppShellProps) {
  useThemeUsageGameGate(isGameOver);

  return (
    <main
      id="main"
      className="min-h-screen px-4 pb-4 pt-1 lg:px-10 lg:pb-10 lg:pt-2"
      data-testid="app-main"
      data-ui-fixture={fixtureName}
    >
      <div className="mx-auto max-w-7xl">
        <div
          className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          data-testid="app-toolbar"
        >
          <div className="flex flex-row gap-2 items-center" data-testid="app-toolbar-left">
            <NewGame
              onJoinOnlineGame={onJoinOnlineGame}
              onStartLocalGame={onStartLocalGame}
              onStartOnlineGame={onStartOnlineGame}
            />
            {statusStrip}
          </div>
          <ThemeSwitcher />
        </div>
        {updateNotice ? <div className="mb-3">{updateNotice}</div> : null}
        {gameBoard}
        {isGameOver && (
          <div className="mt-5 text-center">
            <Button onClick={() => void onReplay()} size="lg" data-testid="replay-button">
              Rejouer
            </Button>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 justify-between">
          {debugStrip}
          <div className="grow"></div>
          <p
            className="app-version-badge flex items-center gap-1.5 text-xs text-muted-foreground/80 tabular-nums"
            data-testid="app-version"
          >
            {isUpdatePending ? (
              <span
                aria-label="Mise à jour prête, elle sera appliquée à la prochaine partie"
                className="inline-block size-2 shrink-0 rounded-full bg-primary"
                data-testid="app-version-update-dot"
                title="Mise à jour prête, elle sera appliquée à la prochaine partie"
              />
            ) : null}
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </main>
  );
}

function FixtureApp({ fixtureName }: { fixtureName: UiFixtureName }) {
  const gameState = getUiFixture(fixtureName);
  const gameBoard = (
    <LocalGameBoard
      gameState={gameState}
      selectCard={() => undefined}
      playCard={() => fixtureActionResult}
      discardCard={() => fixtureActionResult}
      clearSelection={() => undefined}
      canPlayCard={canPlayCard}
    />
  );

  return (
    <AppShell
      fixtureName={fixtureName}
      gameBoard={gameBoard}
      isGameOver={gameState.gameIsOver}
      onJoinOnlineGame={() => Promise.resolve()}
      onReplay={() => undefined}
      onStartLocalGame={() => undefined}
      onStartOnlineGame={() => Promise.resolve()}
    />
  );
}

interface SessionScreenProps {
  isUpdatePending?: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void>;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  updateNotice?: ReactNode;
}

function LocalGameScreen({
  isUpdatePending,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  updateNotice,
}: SessionScreenProps) {
  const {
    clearSelection,
    debugFillBuildPile,
    debugFillHandSkipBo,
    debugClearStockPile,
    debugClearAiStockPile,
    debugWin,
    discardCard,
    gameState,
    playCard,
    selectCard,
  } = useLocalSkipBoGame();
  const gameBoard = (
    <LocalGameBoard
      gameState={gameState}
      selectCard={selectCard}
      playCard={playCard}
      discardCard={discardCard}
      clearSelection={clearSelection}
      canPlayCard={canPlayCard}
    />
  );

  return (
    <AppShell
      debugStrip={
        <DebugStrip
          debugFillBuildPile={() => debugFillBuildPile(0)}
          debugFillHandSkipBo={debugFillHandSkipBo}
          debugClearStockPile={debugClearStockPile}
          debugClearAiStockPile={debugClearAiStockPile}
          debugWin={debugWin}
        />
      }
      gameBoard={gameBoard}
      isGameOver={gameState.gameIsOver}
      isUpdatePending={isUpdatePending}
      onJoinOnlineGame={onJoinOnlineGame}
      onReplay={onReplay}
      onStartLocalGame={onStartLocalGame}
      onStartOnlineGame={onStartOnlineGame}
      updateNotice={updateNotice}
    />
  );
}

interface OnlineGameScreenProps extends SessionScreenProps {
  applyUpdateWhenSafe: () => void;
  onLeaveSession: () => void;
  session: CreateRoomResponse;
}

function OnlineGameScreen({
  applyUpdateWhenSafe,
  isUpdatePending,
  onJoinOnlineGame,
  onLeaveSession,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  session,
  updateNotice,
}: OnlineGameScreenProps) {
  const {
    canStartGame,
    clearSelection,
    connectedSeats,
    connectionStatus,
    debugFillBuildPile,
    debugFillHandSkipBo,
    debugClearStockPile,
    debugClearAiStockPile,
    debugWin,
    discardCard,
    disconnectedSeats,
    gameState,
    isLocalHost,
    kickSeat,
    leaveLobby,
    lobbySeats,
    myReadyState,
    playCard,
    playersBySeatIndex,
    roomCode,
    roomStatus,
    seatCapacity,
    selectCard,
    sendSetReady,
    sendSetUnready,
    startGame,
    lobbyRemovalReason,
  } = useOnlineSkipBoGame(session);
  const { gameState: localGameState } = useLocalSkipBoGame();

  // Online state is rebuilt from the server snapshot after a reload, so applying
  // a pending update is lossless. Only do it at a "safe" moment — never while it
  // is the local player's active turn (index 0 in the recentred view), to avoid
  // cutting off an in-progress action, and never on a finished game so the
  // victory/defeat screen is preserved. The update then lands during an
  // opponent's turn, in the next lobby, or on the user's next deliberate action.
  const isSafeToApplyUpdate = !gameState.gameIsOver && (roomStatus === 'WAITING' || gameState.currentPlayerIndex !== 0);

  useEffect(() => {
    if (isUpdatePending && isSafeToApplyUpdate) {
      applyUpdateWhenSafe();
    }
  }, [isUpdatePending, isSafeToApplyUpdate, applyUpdateWhenSafe]);

  const handleLeave = () => {
    leaveLobby();
    onLeaveSession();
  };

  const gameBoard =
    roomStatus === 'WAITING' ? (
      <LocalGameBoard
        gameState={localGameState}
        selectCard={() => undefined}
        playCard={() => Promise.resolve({ success: true, message: '' })}
        discardCard={() => Promise.resolve({ success: true, message: '' })}
        clearSelection={() => undefined}
        canPlayCard={canPlayCard}
      />
    ) : (
      <OnlineGameBoard
        gameState={gameState}
        selectCard={selectCard}
        playCard={playCard}
        discardCard={discardCard}
        clearSelection={clearSelection}
        canPlayCard={canPlayCard}
      />
    );

  return (
    <>
      <LobbyRemovedDialog reason={lobbyRemovalReason} onDismiss={onLeaveSession} />
      <LobbyDialog
        canStartGame={canStartGame}
        connectedSeats={connectedSeats}
        isHost={isLocalHost}
        kickSeat={kickSeat}
        lobbySeats={lobbySeats}
        mySeatIndex={session.seatIndex}
        myReadyState={myReadyState}
        onLeave={handleLeave}
        onReady={sendSetReady}
        onStartGame={startGame}
        onUnready={sendSetUnready}
        open={roomStatus === 'WAITING' && lobbyRemovalReason === null}
        roomCode={roomCode}
        seatCapacity={seatCapacity}
      />
      <AppShell
        debugStrip={
          <DebugStrip
            debugFillBuildPile={() => debugFillBuildPile(0)}
            debugFillHandSkipBo={debugFillHandSkipBo}
            debugClearStockPile={debugClearStockPile}
            debugClearAiStockPile={debugClearAiStockPile}
            debugWin={debugWin}
          />
        }
        gameBoard={gameBoard}
        isGameOver={gameState.gameIsOver}
        isUpdatePending={isUpdatePending}
        onJoinOnlineGame={onJoinOnlineGame}
        onReplay={onReplay}
        onStartLocalGame={onStartLocalGame}
        onStartOnlineGame={onStartOnlineGame}
        statusStrip={
          <OnlineStatusStrip
            canStartGame={canStartGame}
            connectedSeats={connectedSeats}
            connectionStatus={connectionStatus}
            disconnectedSeats={disconnectedSeats}
            isHost={isLocalHost}
            onStartGame={startGame}
            playersBySeatIndex={playersBySeatIndex}
            roomCode={roomCode}
            roomStatus={roomStatus}
            seatCapacity={seatCapacity}
          />
        }
        updateNotice={updateNotice}
      />
    </>
  );
}

function LiveApp() {
  const { waitForAnimations } = useCardAnimation();
  const [currentGameType, setCurrentGameType] = useState<GameType>('local-ai');
  const [localSessionVersion, setLocalSessionVersion] = useState(0);
  const [onlineSession, setOnlineSession] = useState<CreateRoomResponse | null>(null);
  const [pendingResumeSession, setPendingResumeSession] = useState<CreateRoomResponse | null>(() =>
    loadOnlineSession(),
  );
  // A local single-player game can't be rebuilt after a reload, so we hold off the
  // blocking minimum-version auto-reload while in local mode and apply it on the
  // next deliberate action instead (see the game-start handlers below).
  const isLocalMode = currentGameType === 'local-ai';
  const {
    applyUpdateOnceForCurrentTarget,
    currentAppVersion,
    dismissJustUpdated,
    isApplyingUpdate,
    isHardUpdateRequired,
    isUpdatePending,
    justUpdatedFromVersion,
    latestAppVersion,
    minimumSupportedVersion,
    reloadToUpdate,
  } = usePwaVersionGate({ deferHardUpdate: isLocalMode });

  useEffect(() => {
    animationServiceBridge.waitForAnimations = waitForAnimations;
  }, [waitForAnimations]);

  const startLocalGame = () => {
    // A required hard update was deferred while in local mode — apply it now and
    // abort the start (the reload boots into a fresh local game).
    if (isHardUpdateRequired) {
      reloadToUpdate();
      return;
    }

    // Starting a fresh local game is a lossless moment to apply a pending soft
    // update — but the `runtime:` channel can report a version before the service
    // worker has staged it, in which case `reloadToUpdate()` is a no-op. Fire it
    // and still start the game so a lagging SW can't leave "New Game" stuck.
    if (isUpdatePending) {
      reloadToUpdate();
    }

    setCurrentGameType('local-ai');
    setLocalSessionVersion((currentValue) => currentValue + 1);
  };

  const startOnlineGame = async (stockSize = getStoredStockSize()) => {
    // Never contact the server on a build below the protocol floor — apply the
    // deferred hard update first (the reload aborts this start).
    if (isHardUpdateRequired) {
      reloadToUpdate();
      return;
    }

    const session = await createOnlineRoom(stockSize);
    saveOnlineSession(session);
    setPendingResumeSession(null);
    setOnlineSession(session);
    setCurrentGameType('online-human');
  };

  const joinGame = async (roomCode: string) => {
    if (isHardUpdateRequired) {
      reloadToUpdate();
      return;
    }

    const session = await joinOnlineRoom(roomCode);
    saveOnlineSession(session);
    setPendingResumeSession(null);
    setOnlineSession(session);
    setCurrentGameType('online-human');
  };

  const leaveOnlineSession = () => {
    clearOnlineSession();
    setPendingResumeSession(null);
    setOnlineSession(null);
    setCurrentGameType('local-ai');
  };

  const resumeOnlineSession = () => {
    if (!pendingResumeSession) return;
    setOnlineSession(pendingResumeSession);
    setCurrentGameType('online-human');
    setPendingResumeSession(null);
  };

  const dismissPendingResumeSession = () => {
    clearOnlineSession();
    setPendingResumeSession(null);
  };

  const replayCurrentGame = async () => {
    if (currentGameType === 'local-ai') {
      startLocalGame();
      return;
    }

    await startOnlineGame();
  };

  const showResumeBanner = pendingResumeSession !== null && onlineSession === null;
  const showUpdatedBanner = justUpdatedFromVersion !== null;
  const updateNotice = (
    <>
      {showResumeBanner ? (
        <ResumeGameBanner
          isResuming={false}
          onDismiss={dismissPendingResumeSession}
          onResume={resumeOnlineSession}
          roomCode={pendingResumeSession.roomCode}
        />
      ) : null}
      {showUpdatedBanner ? (
        <AppUpdatedBanner currentVersion={currentAppVersion} onDismiss={dismissJustUpdated} />
      ) : null}
    </>
  );
  const hasUpdateNotice = showResumeBanner || showUpdatedBanner;

  const screen =
    currentGameType === 'online-human' && onlineSession ? (
      <OnlineGameScreen
        key={`${onlineSession.roomCode}-${onlineSession.seatToken}`}
        applyUpdateWhenSafe={applyUpdateOnceForCurrentTarget}
        isUpdatePending={isUpdatePending}
        onJoinOnlineGame={joinGame}
        onLeaveSession={leaveOnlineSession}
        onReplay={replayCurrentGame}
        onStartLocalGame={startLocalGame}
        onStartOnlineGame={startOnlineGame}
        session={onlineSession}
        updateNotice={hasUpdateNotice ? updateNotice : undefined}
      />
    ) : (
      <LocalGameScreen
        key={`local-${localSessionVersion}`}
        isUpdatePending={isUpdatePending}
        onJoinOnlineGame={joinGame}
        onReplay={replayCurrentGame}
        onStartLocalGame={startLocalGame}
        onStartOnlineGame={startOnlineGame}
        updateNotice={hasUpdateNotice ? updateNotice : undefined}
      />
    );

  return (
    <>
      {screen}
      {isHardUpdateRequired && !isLocalMode && minimumSupportedVersion ? (
        <ForcedUpdateOverlay
          currentVersion={currentAppVersion}
          isReloading={isApplyingUpdate}
          latestVersion={latestAppVersion}
          minimumSupportedVersion={minimumSupportedVersion}
          onReload={reloadToUpdate}
        />
      ) : null}
    </>
  );
}

function App() {
  useThemeColorMeta();
  useThemeUsageReporter();
  const fixtureName = getRequestedUiFixtureName();

  if (fixtureName) {
    return <FixtureApp fixtureName={fixtureName} />;
  }

  return <LiveApp />;
}

export default App;
