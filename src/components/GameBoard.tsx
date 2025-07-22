import { GameState, Card as CardType } from '@/types';
import { PlayerArea } from '@/components/PlayerArea';
import { CenterArea } from '@/components/CenterArea';

interface GameBoardProps {
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => { success: boolean; message: string };
  discardCard: (discardPileIndex: number) => { success: boolean; message: string };
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* AI Player Area */}
      <PlayerArea
        player={aiPlayer}
        playerIndex={1}
        title="Joueur IA"
        isCurrentPlayer={!isPlayerTurn}
        gameState={gameState}
        selectCard={selectCard}
        discardCard={discardCard}
      />

      {/* Center Game Area */}
      <CenterArea 
        gameState={gameState} 
        playCard={playCard}
      />

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
        selectCard={selectCard}
        discardCard={discardCard}
      />
    </div>
  );
}
