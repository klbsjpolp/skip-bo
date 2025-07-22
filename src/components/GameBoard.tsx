import { GameState } from '@/types';
import { PlayerArea } from '@/components/PlayerArea';
import { CenterArea } from '@/components/CenterArea';

interface GameBoardProps {
  gameState: GameState;
}

export function GameBoard({ gameState }: GameBoardProps) {
  const aiPlayer = gameState.players[1];
  const humanPlayer = gameState.players[0];
  const isPlayerTurn = gameState.currentPlayerIndex === 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* AI Player Area */}
      <PlayerArea
        player={aiPlayer}
        playerIndex={1}
        title="Joueur IA"
        isCurrentPlayer={!isPlayerTurn}
        gameState={gameState}
      />

      {/* Center Game Area */}
      <CenterArea gameState={gameState} />

      {/* Game Message */}
      <div className="text-center font-bold text-xl my-4 h-8">
        {gameState.message}
      </div>

      {/* Human Player Area */}
      <PlayerArea
        player={humanPlayer}
        playerIndex={0}
        title={isPlayerTurn ? "Votre tour" : "En attente..."}
        isCurrentPlayer={isPlayerTurn}
        gameState={gameState}
      />
    </div>
  );
}
