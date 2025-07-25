import { useEffect } from 'react';
import { useSkipBoGame } from '@/hooks/useSkipBoGame';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { DifficultySwitcher } from '@/components/DifficultySwitcher';
import { GameBoard } from '@/components/GameBoard';
import { Button } from '@/components/ui/button';

function App() {
  const { gameState, initializeGame, selectCard, playCard, discardCard, clearSelection, canPlayCard } = useSkipBoGame();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="min-h-screen p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <ThemeSwitcher />
          <DifficultySwitcher />
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
