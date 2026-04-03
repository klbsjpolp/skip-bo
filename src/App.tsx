import { useSkipBoGame } from '@/hooks/useSkipBoGame';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { GameBoard } from '@/components/GameBoard';
import { Button } from '@/components/ui/button';
import NewGame from "@/components/NewGame.tsx";
import { useCardAnimation } from '@/contexts/useCardAnimation';
import { animationServiceBridge } from '@/lib/animationServiceBridge';
import { useEffect } from 'react';
import { canPlayCard } from '@/lib/validators';
import { APP_VERSION } from '@/lib/appVersion';
import { getRequestedUiFixtureName, getUiFixture, type UiFixtureName } from '@/testing/uiFixtures';
import type { GameState } from '@/types';

const fixtureActionResult = Promise.resolve({ success: true, message: 'Fixture mode' });

interface AppShellProps {
  gameState: GameState;
  initializeGame: () => void;
  debugFillBuildPile: () => void;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  clearSelection: () => void;
  fixtureName?: UiFixtureName;
}

function AppShell({
  gameState,
  initializeGame,
  debugFillBuildPile,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
  fixtureName,
}: AppShellProps) {
  return (
    <main
      id="main"
      className="min-h-screen p-4 lg:p-10"
      data-testid="app-main"
      data-ui-fixture={fixtureName}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          data-testid="app-toolbar"
        >
          <NewGame onNewGame={initializeGame} onDebugFillBuildPile={debugFillBuildPile} />
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
          <div className="text-center mt-5">
            <Button onClick={initializeGame} size="lg" data-testid="replay-button">
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
      gameState={gameState}
      initializeGame={() => undefined}
      debugFillBuildPile={() => undefined}
      selectCard={() => undefined}
      playCard={() => fixtureActionResult}
      discardCard={() => fixtureActionResult}
      clearSelection={() => undefined}
      fixtureName={fixtureName}
    />
  );
}

function LiveApp() {
  const {
    gameState,
    initializeGame,
    debugFillBuildPile,
    selectCard,
    playCard,
    discardCard,
    clearSelection,
  } = useSkipBoGame();
  const { waitForAnimations } = useCardAnimation();

  // Connect the animation context with the service bridge
  useEffect(() => {
    animationServiceBridge.waitForAnimations = waitForAnimations;
  }, [waitForAnimations]);

  return (
    <AppShell
      gameState={gameState}
      initializeGame={initializeGame}
      debugFillBuildPile={() => debugFillBuildPile(0)}
      selectCard={selectCard}
      playCard={playCard}
      discardCard={discardCard}
      clearSelection={clearSelection}
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
