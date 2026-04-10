import {type ReactNode, useEffect, useState} from 'react';

import type {CreateRoomResponse} from '@skipbo/multiplayer-protocol';

import {useLocalSkipBoGame} from '@/hooks/useLocalSkipBoGame';
import {useOnlineSkipBoGame} from '@/hooks/useOnlineSkipBoGame';
import type {GameType} from '@/app/types';
import {OnlineStatusStrip} from '@/components/OnlineStatusStrip';
import {ThemeSwitcher} from '@/components/ThemeSwitcher';
import {LocalGameBoard} from '@/components/LocalGameBoard';
import {OnlineGameBoard} from '@/components/OnlineGameBoard';
import {Button} from '@/components/ui/button';
import NewGame from '@/components/NewGame';
import {useCardAnimation} from '@/contexts/useCardAnimation';
import {animationServiceBridge} from '@/lib/animationServiceBridge';
import {APP_VERSION} from '@/lib/appVersion';
import {canPlayCard} from '@/lib/validators';
import {createOnlineRoom, joinOnlineRoom} from '@/online/api';
import {getStoredStockSize} from '@/state/initialGameState';
import {getRequestedUiFixtureName, getUiFixture, type UiFixtureName} from '@/testing/uiFixtures';
import {DebugStrip} from "@/components/DebugStrip";

const fixtureActionResult = Promise.resolve({ success: true, message: 'Fixture mode' });

interface AppShellProps {
  debugStrip?: ReactNode;
  fixtureName?: UiFixtureName;
  gameBoard: ReactNode;
  isGameOver: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void> | void;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  statusStrip?: ReactNode;
}

function AppShell({
  debugStrip,
  fixtureName,
  gameBoard,
  isGameOver,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
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
            className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            data-testid="app-toolbar"
        >
          <div
              className="flex flex-row gap-2 items-center"
              data-testid="app-toolbar-left"
          >
            <NewGame
                onJoinOnlineGame={onJoinOnlineGame}
                onStartLocalGame={onStartLocalGame}
                onStartOnlineGame={onStartOnlineGame}
            />
            {statusStrip}
          </div>
          <ThemeSwitcher/>
        </div>
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
      onJoinOnlineGame={async () => undefined}
      onReplay={() => undefined}
      onStartLocalGame={() => undefined}
      onStartOnlineGame={async () => undefined}
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
      debugStrip={<DebugStrip
          debugFillBuildPile={() => debugFillBuildPile(0)}
          debugWin={debugWin}
      />}
      gameBoard={gameBoard}
      isGameOver={gameState.gameIsOver}
      onJoinOnlineGame={onJoinOnlineGame}
      onReplay={onReplay}
      onStartLocalGame={onStartLocalGame}
      onStartOnlineGame={onStartOnlineGame}
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
  const gameBoard = (
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
    <AppShell
      gameBoard={gameBoard}
      isGameOver={gameState.gameIsOver}
      onJoinOnlineGame={onJoinOnlineGame}
      onReplay={onReplay}
      onStartLocalGame={onStartLocalGame}
      onStartOnlineGame={onStartOnlineGame}
      statusStrip={
        <OnlineStatusStrip
          connectedSeats={connectedSeats}
          connectionStatus={connectionStatus}
          roomCode={roomCode}
          roomStatus={roomStatus}
          seatCapacity={2}
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
