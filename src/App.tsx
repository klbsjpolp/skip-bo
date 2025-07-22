import { useEffect } from 'react';
import { useSkipBoGame } from '@/hooks/useSkipBoGame';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { GameBoard } from '@/components/GameBoard';
import { Button } from '@/components/ui/button';

function App() {
  const { gameState, initializeGame, selectCard, playCard, discardCard, clearSelection, canPlayCard } = useSkipBoGame();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="min-h-screen p-4 md:p-10 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        <ThemeSwitcher />
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
