import { Player, GameState } from '@/types';
import { Card } from '@/components/Card';
import { cn } from '@/lib/utils';
import { useSkipBoGame } from '@/hooks/useSkipBoGame';

interface PlayerAreaProps {
  player: Player;
  playerIndex: number;
  title: string;
  isCurrentPlayer: boolean;
  gameState: GameState;
}

export function PlayerArea({ player, playerIndex, title, isCurrentPlayer, gameState }: PlayerAreaProps) {
  const isHuman = !player.isAI;
  const { selectCard, discardCard } = useSkipBoGame();

  return (
    <div className={cn(
      "player-area",
      isCurrentPlayer && "ring-2 ring-primary"
    )}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      <div className="flex justify-between items-start gap-8">
        {/* Stock Pile */}
        <div className="text-center w-32">
          <h3 className="text-sm mb-2">
            Talon ({player.stockPile.length})
          </h3>
          <div className="mx-auto">
            {player.stockPile.length > 0 ? (
              <Card
                card={player.stockPile[player.stockPile.length - 1]}
                isRevealed={isHuman}
                onClick={() => {
                  if (isHuman && isCurrentPlayer) {
                    selectCard('stock', player.stockPile.length - 1);
                  }
                }}
                isSelected={
                  gameState.selectedCard?.source === 'stock' &&
                  gameState.currentPlayerIndex === playerIndex
                }
              />
            ) : (
              <div className="card opacity-50">Vide</div>
            )}
          </div>
        </div>

        {/* Hand */}
        <div className="text-center flex-1">
          <h3 className="text-sm mb-2">
            {isHuman ? 'Votre main' : 'Sa main'}
          </h3>
          <div className="hand-area">
            {player.hand.map((card, index) => (
              <Card
                key={`hand-${index}`}
                card={card}
                isRevealed={isHuman}
                onClick={() => {
                  if (isHuman && isCurrentPlayer) {
                    selectCard('hand', index);
                  }
                }}
                isSelected={
                  gameState.selectedCard?.source === 'hand' &&
                  gameState.selectedCard.index === index &&
                  gameState.currentPlayerIndex === playerIndex
                }
              />
            ))}
          </div>
        </div>

        {/* Discard Piles */}
        <div className="text-center">
          <h3 className="text-sm mb-2">Piles de défausse</h3>
          <div className="discard-piles">
            {player.discardPiles.map((pile, pileIndex) => (
              <div key={`discard-${pileIndex}`} className="discard-pile-stack">
                {pile.length > 0 ? (
                  <Card
                    card={pile[pile.length - 1]}
                    isRevealed={true}
                    onClick={() => {
                      if (isHuman && isCurrentPlayer) {
                        selectCard('discard', pile.length - 1, pileIndex);
                      }
                    }}
                    isSelected={
                      gameState.selectedCard?.source === 'discard' &&
                      gameState.selectedCard.discardPileIndex === pileIndex &&
                      gameState.currentPlayerIndex === playerIndex
                    }
                  />
                ) : (
                  <div
                    className="card opacity-30 hover:opacity-60"
                    onClick={() => {
                      if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                        discardCard(pileIndex);
                      }
                    }}
                  >
                    Vide
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
