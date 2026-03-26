import { useSkipBoGame } from '@/hooks/useSkipBoGame';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { GameBoard } from '@/components/GameBoard';
import { Button } from '@/components/ui/button';
import NewGame from "@/components/NewGame.tsx";
import { useCardAnimation } from '@/contexts/useCardAnimation';
import { animationServiceBridge } from '@/lib/animationServiceBridge';
import { useEffect } from 'react';

function App() {
  const { gameState, initializeGame, selectCard, playCard, discardCard, clearSelection, canPlayCard, debugSetWinner } = useSkipBoGame();
  const { waitForAnimations } = useCardAnimation();

  // Connect the animation context with the service bridge
  useEffect(() => {
    animationServiceBridge.waitForAnimations = waitForAnimations;
  }, [waitForAnimations]);

  return (
    <div id="main" className="min-h-screen p-4 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <NewGame onNewGame={initializeGame} />
            <div className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
                Debug victoire
              </span>
              <Button variant="outline" size="sm" onClick={() => debugSetWinner(0)}>
                Joueur
              </Button>
              <Button variant="outline" size="sm" onClick={() => debugSetWinner(1)}>
                IA
              </Button>
            </div>
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
          <div className="text-center mt-5">
            <Button onClick={initializeGame} size="lg">
              Rejouer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
