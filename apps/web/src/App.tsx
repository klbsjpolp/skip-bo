import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import type { CreateRoomResponse } from '@klbsjpolp/realtime-core';

import { useLocalSkipBoGame } from '@/hooks/useLocalSkipBoGame';
import type { GameType } from '@/app/types';
import { AppShell, type SessionScreenProps } from '@/components/AppShell';
import { AppUpdatedBanner } from '@/components/AppUpdatedBanner';
import { ForcedUpdateOverlay } from '@/components/ForcedUpdateOverlay';
import { ResumeGameBanner } from '@/components/ResumeGameBanner';
import { LocalGameBoard } from '@/components/LocalGameBoard';
import { useCardAnimation } from '@/contexts/useCardAnimation';
import { animationServiceBridge } from '@/lib/animationServiceBridge';
import { isSafeToApplyLocalUpdate } from '@/lib/localUpdateGate';
import { canPlayCard } from '@/lib/validators';
import { createOnlineRoom, joinOnlineRoom } from '@/online/api';
import { getStoredStockSize } from '@/state/initialGameState';
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from '@/state/sessionPersistence';
import {
  getRequestedUiFixtureName,
  getStatsDialogFixtureRecord,
  getUiFixture,
  type UiFixtureName,
} from '@/testing/uiFixtures';
import { DebugStrip } from '@/components/DebugStrip';
import { usePwaVersionGate } from '@/hooks/usePwaVersionGate';
import { useThemeColorMeta } from '@/hooks/useThemeColorMeta';
import { useThemeUsageReporter } from '@/hooks/useThemeUsageReporter';
import { buildGameStatsSnapshot, useGameStatsRecorder } from '@/hooks/useGameStatsRecorder';

// Code-split: the online stack (host runtime, online hook, online board, lobby
// dialogs) is fetched only when a player actually starts or joins an online
// game, keeping it out of the initial load for the common local-AI path.
const OnlineGameScreen = lazy(() => import('@/components/OnlineGameScreen'));

const fixtureActionResult = Promise.resolve({ success: true, message: 'Fixture mode' });

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
      statsRecord={getStatsDialogFixtureRecord()}
    />
  );
}

interface LocalGameScreenProps extends SessionScreenProps {
  applyUpdateWhenSafe: () => void;
}

function LocalGameScreen({
  applyUpdateWhenSafe,
  isApplyingUpdate,
  isUpdatePending,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  onUpdateNow,
  updateNotice,
}: LocalGameScreenProps) {
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

  const statsSnapshot = useMemo(() => buildGameStatsSnapshot(gameState, 'local'), [gameState]);
  const { lastRecord: statsRecord } = useGameStatsRecorder(statsSnapshot, {
    mode: 'local',
    isCentralReporter: true,
  });

  // Apply a pending update without a wall-clock deadline: a service worker that
  // finishes downloading minutes after open is still caught on the next idle
  // render, while an in-progress game is never reloaded out from under the
  // player. See isSafeToApplyLocalUpdate for what counts as a lossless moment.
  const isSafeToApplyUpdate = isSafeToApplyLocalUpdate(gameState);

  useEffect(() => {
    if (isUpdatePending && isSafeToApplyUpdate) {
      applyUpdateWhenSafe();
    }
  }, [isUpdatePending, isSafeToApplyUpdate, applyUpdateWhenSafe]);

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
      isApplyingUpdate={isApplyingUpdate}
      isGameOver={gameState.gameIsOver}
      isUpdatePending={isUpdatePending}
      onJoinOnlineGame={onJoinOnlineGame}
      onReplay={onReplay}
      onStartLocalGame={onStartLocalGame}
      onStartOnlineGame={onStartOnlineGame}
      onUpdateNow={onUpdateNow}
      statsRecord={statsRecord}
      updateNotice={updateNotice}
    />
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
      <Suspense fallback={null}>
        <OnlineGameScreen
          key={`${onlineSession.roomCode}-${onlineSession.seatToken}`}
          applyUpdateWhenSafe={applyUpdateOnceForCurrentTarget}
          isApplyingUpdate={isApplyingUpdate}
          isUpdatePending={isUpdatePending}
          onJoinOnlineGame={joinGame}
          onLeaveSession={leaveOnlineSession}
          onReplay={replayCurrentGame}
          onStartLocalGame={startLocalGame}
          onStartOnlineGame={startOnlineGame}
          onUpdateNow={reloadToUpdate}
          session={onlineSession}
          updateNotice={hasUpdateNotice ? updateNotice : undefined}
        />
      </Suspense>
    ) : (
      <LocalGameScreen
        key={`local-${localSessionVersion}`}
        applyUpdateWhenSafe={applyUpdateOnceForCurrentTarget}
        isApplyingUpdate={isApplyingUpdate}
        isUpdatePending={isUpdatePending}
        onJoinOnlineGame={joinGame}
        onReplay={replayCurrentGame}
        onStartLocalGame={startLocalGame}
        onStartOnlineGame={startOnlineGame}
        onUpdateNow={reloadToUpdate}
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
