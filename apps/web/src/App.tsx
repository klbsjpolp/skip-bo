import { useEffect, useState, type ReactNode } from 'react';

import type { CreateRoomResponse } from '@skipbo/multiplayer-protocol';

import { useLocalSkipBoGame } from '@/hooks/useLocalSkipBoGame';
import { useOnlineSkipBoGame } from '@/hooks/useOnlineSkipBoGame';
import type { GameType } from '@/app/types';
import { OnlineStatusStrip } from '@/components/OnlineStatusStrip';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { GameBoard } from '@/components/GameBoard';
import { Button } from '@/components/ui/button';
import NewGame from '@/components/NewGame';
import { useCardAnimation } from '@/contexts/useCardAnimation';
import { animationServiceBridge } from '@/lib/animationServiceBridge';
import { APP_VERSION } from '@/lib/appVersion';
import { canPlayCard } from '@/lib/validators';
import { createOnlineRoom, joinOnlineRoom } from '@/online/api';
import { getStoredStockSize } from '@/state/initialGameState';
import { getRequestedUiFixtureName, getUiFixture, type UiFixtureName } from '@/testing/uiFixtures';
import type { GameState } from '@/types';

const fixtureActionResult = Promise.resolve({ success: true, message: 'Fixture mode' });

interface AppShellProps {
  clearSelection: () => void;
  debugFillBuildPile?: () => void;
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  fixtureName?: UiFixtureName;
  gameState: GameState;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void> | void;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  statusStrip?: ReactNode;
}

function AppShell({
  clearSelection,
  debugFillBuildPile,
  discardCard,
  fixtureName,
  gameState,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  playCard,
  selectCard,
  statusStrip,
}: AppShellProps) {
  return (
    <main
      id="main"
      className="min-h-screen px-4 pb-4 pt-1 lg:px-10 lg:pb-10 lg:pt-2"
      data-testid="app-main"
      data-ui-fixture={fixtureName}
    >
      <div className="mx-auto max-w-7xl">
        <div
          className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          data-testid="app-toolbar"
        >
          <div
              className="flex flex-row gap-2 items-center"
              data-testid="app-toolbar-left"
          >
            <NewGame
              onDebugFillBuildPile={debugFillBuildPile}
              onJoinOnlineGame={onJoinOnlineGame}
              onStartLocalGame={onStartLocalGame}
              onStartOnlineGame={onStartOnlineGame}
            />
            {statusStrip}
          </div>
          <ThemeSwitcher />
        </div>
        <GameBoard
          gameState={gameState}
          selectCard={selectCard}
          playCard={playCard}
          discardCard={discardCard}
          clearSelection={clearSelection}
          canPlayCard={canPlayCard}
        />
        {gameState.gameIsOver && (
          <div className="mt-5 text-center">
            <Button onClick={() => void onReplay()} size="lg" data-testid="replay-button">
              Rejouer
            </Button>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <p
            className="app-version-badge text-xs text-muted-foreground/80 tabular-nums"
            data-testid="app-version"
          >
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </main>
  );
}

function FixtureApp({ fixtureName }: { fixtureName: UiFixtureName }) {
  const gameState = getUiFixture(fixtureName);

  return (
    <AppShell
      clearSelection={() => undefined}
      discardCard={() => fixtureActionResult}
      fixtureName={fixtureName}
      gameState={gameState}
      onJoinOnlineGame={async () => undefined}
      onReplay={() => undefined}
      onStartLocalGame={() => undefined}
      onStartOnlineGame={async () => undefined}
      playCard={() => fixtureActionResult}
      selectCard={() => undefined}
    />
  );
}

interface SessionScreenProps {
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void>;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
}

function LocalGameScreen({
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
}: SessionScreenProps) {
  const {
    clearSelection,
    debugFillBuildPile,
    discardCard,
    gameState,
    playCard,
    selectCard,
  } = useLocalSkipBoGame();

  return (
    <AppShell
      clearSelection={clearSelection}
      debugFillBuildPile={() => debugFillBuildPile(0)}
      discardCard={discardCard}
      gameState={gameState}
      onJoinOnlineGame={onJoinOnlineGame}
      onReplay={onReplay}
      onStartLocalGame={onStartLocalGame}
      onStartOnlineGame={onStartOnlineGame}
      playCard={playCard}
      selectCard={selectCard}
    />
  );
}

interface OnlineGameScreenProps extends SessionScreenProps {
  session: CreateRoomResponse;
}

function OnlineGameScreen({
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  session,
}: OnlineGameScreenProps) {
  const {
    clearSelection,
    connectedSeats,
    connectionStatus,
    discardCard,
    gameState,
    playCard,
    roomCode,
    roomStatus,
    selectCard,
  } = useOnlineSkipBoGame(session);

  return (
    <AppShell
      clearSelection={clearSelection}
      discardCard={discardCard}
      gameState={gameState}
      onJoinOnlineGame={onJoinOnlineGame}
      onReplay={onReplay}
      onStartLocalGame={onStartLocalGame}
      onStartOnlineGame={onStartOnlineGame}
      playCard={playCard}
      selectCard={selectCard}
      statusStrip={
        <OnlineStatusStrip
          connectedSeats={connectedSeats}
          connectionStatus={connectionStatus}
          roomCode={roomCode}
          roomStatus={roomStatus}
        />
      }
    />
  );
}

function LiveApp() {
  const { waitForAnimations } = useCardAnimation();
  const [currentGameType, setCurrentGameType] = useState<GameType>('local-ai');
  const [localSessionVersion, setLocalSessionVersion] = useState(0);
  const [onlineSession, setOnlineSession] = useState<CreateRoomResponse | null>(null);

  useEffect(() => {
    animationServiceBridge.waitForAnimations = waitForAnimations;
  }, [waitForAnimations]);

  const startLocalGame = () => {
    setCurrentGameType('local-ai');
    setLocalSessionVersion((currentValue) => currentValue + 1);
  };

  const startOnlineGame = async (stockSize = getStoredStockSize()) => {
    const session = await createOnlineRoom(stockSize);
    setOnlineSession(session);
    setCurrentGameType('online-human');
  };

  const joinGame = async (roomCode: string) => {
    const session = await joinOnlineRoom(roomCode);
    setOnlineSession(session);
    setCurrentGameType('online-human');
  };

  const replayCurrentGame = async () => {
    if (currentGameType === 'local-ai') {
      startLocalGame();
      return;
    }

    await startOnlineGame();
  };

  if (currentGameType === 'online-human' && onlineSession) {
    return (
      <OnlineGameScreen
        key={`${onlineSession.roomCode}-${onlineSession.seatToken}`}
        onJoinOnlineGame={joinGame}
        onReplay={replayCurrentGame}
        onStartLocalGame={startLocalGame}
        onStartOnlineGame={startOnlineGame}
        session={onlineSession}
      />
    );
  }

  return (
    <LocalGameScreen
      key={`local-${localSessionVersion}`}
      onJoinOnlineGame={joinGame}
      onReplay={replayCurrentGame}
      onStartLocalGame={startLocalGame}
      onStartOnlineGame={startOnlineGame}
    />
  );
}

function App() {
  const fixtureName = getRequestedUiFixtureName();

  if (fixtureName) {
    return <FixtureApp fixtureName={fixtureName} />;
  }

  return <LiveApp />;
}

export default App;
