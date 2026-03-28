import type {GameState, Card as CardType} from '@/types';
import { PlayerArea } from '@/components/PlayerArea';
import { CenterArea } from '@/components/CenterArea';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  clearSelection: () => void;
  canPlayCard: (card: CardType, buildPileIndex: number, gameState: GameState) => boolean;
}

export function GameBoard({ 
  gameState, 
  selectCard, 
  playCard, 
  discardCard, 
  clearSelection, 
  canPlayCard 
}: GameBoardProps) {
  const aiPlayer = gameState.players[1];
  const humanPlayer = gameState.players[0];
  const isPlayerTurn = gameState.currentPlayerIndex === 0;
  const winner = gameState.winnerIndex !== null ? gameState.players[gameState.winnerIndex] : null;

  return (
    <div className={cn("game-board max-w-7xl mx-auto", winner && "game-board-victory")}>
      {/* AI Player Area */}
      <PlayerArea
        player={aiPlayer}
        playerIndex={1}
        isCurrentPlayer={!isPlayerTurn}
        isWinner={gameState.winnerIndex === 1}
        gameState={gameState}
        selectCard={selectCard}
        discardCard={discardCard}
        clearSelection={clearSelection}
      />

      {/* Center Game Area */}
      <CenterArea 
        gameState={gameState} 
        playCard={playCard}
        canPlayCard={canPlayCard}
      />

      {/* Game Message */}
      <h1 className="my-4 lg:my-6">
        {gameState.message}
      </h1>

      {/* Human Player Area */}
      <PlayerArea
        player={humanPlayer}
        playerIndex={0}
        isCurrentPlayer={isPlayerTurn}
        isWinner={gameState.winnerIndex === 0}
        gameState={gameState}
        selectCard={selectCard}
        discardCard={discardCard}
        clearSelection={clearSelection}
      />
    </div>
  );
}
