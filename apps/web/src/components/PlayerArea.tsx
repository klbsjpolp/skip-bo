import type { GameState, MoveResult, Player } from '@skipbo/game-core';

import { VictoryEffects } from '@/components/VictoryEffects';
import { DiscardPiles } from '@/components/player-area/DiscardPiles';
import { HandSection } from '@/components/player-area/HandSection';
import { StockPile } from '@/components/player-area/StockPile';
import { cn } from '@/lib/utils';

export { DiscardPiles, HandSection, StockPile };

export interface PlayerAreaProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  isWinner: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<MoveResult>;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  clearSelection: () => void;
}

export function PlayerArea({
  player,
  playerIndex,
  isCurrentPlayer,
  isWinner,
  gameState,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
}: PlayerAreaProps) {
  return (
    <div
      className={cn('player-area ring-3', isCurrentPlayer && 'active-turn', isWinner && 'winner')}
      data-player-type={player.isAI ? 'ai' : 'human'}
      data-player-index={playerIndex}
      data-player-state={isWinner ? 'winner' : isCurrentPlayer ? 'active' : 'idle'}
      data-testid={player.isAI ? 'ai-player-area' : 'human-player-area'}
      aria-label={player.isAI ? 'Zone du joueur IA' : 'Zone du joueur humain'}
    >
      <div className="bg-layer" />
      {isWinner && <VictoryEffects />}
      <div className="content-layer flex items-center gap-1 lg:gap-4 h-full flex-wrap">
        {player.name && <h2 className="vertical-text border-l border-primary">{player.name}</h2>}
        <StockPile
          player={player}
          playerIndex={playerIndex}
          isCurrentPlayer={isCurrentPlayer}
          gameState={gameState}
          selectCard={selectCard}
          playCard={playCard}
          discardCard={discardCard}
          clearSelection={clearSelection}
        />
        <HandSection
          player={player}
          playerIndex={playerIndex}
          isCurrentPlayer={isCurrentPlayer}
          gameState={gameState}
          selectCard={selectCard}
          playCard={playCard}
          discardCard={discardCard}
          clearSelection={clearSelection}
        />
        <div className="grow"></div>
        <DiscardPiles
          player={player}
          playerIndex={playerIndex}
          isCurrentPlayer={isCurrentPlayer}
          gameState={gameState}
          playCard={playCard}
          discardCard={discardCard}
          selectCard={selectCard}
          clearSelection={clearSelection}
        />
      </div>
    </div>
  );
}
