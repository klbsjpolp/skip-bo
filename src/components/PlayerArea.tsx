import { Player, GameState } from '@/types';
import { Card } from '@/components/Card';
import { cn } from '@/lib/utils';
import {EmptyCard} from "@/components/EmptyCard.tsx";

interface PlayerAreaProps {
  player: Player;
  playerIndex: number;
  title: string;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  discardCard: (discardPileIndex: number) => { success: boolean; message: string };
}

export function PlayerArea({ 
  player, 
  playerIndex, 
  title, 
  isCurrentPlayer, 
  gameState,
  selectCard,
  discardCard
}: PlayerAreaProps) {
  const isHuman = !player.isAI;

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
                isRevealed={true}
                onClick={() => {
                  if (isHuman && isCurrentPlayer) {
                    selectCard('stock', player.stockPile.length - 1);
                  }
                }}
                isSelected={
                  gameState.selectedCard?.source === 'stock' &&
                  gameState.currentPlayerIndex === playerIndex
                }
                canBeGrabbed={isHuman && isCurrentPlayer}
              />
            ) : (
              <EmptyCard />
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
                canBeGrabbed={isHuman && isCurrentPlayer}
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
                  <div
                    className={`${isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand' ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-default'}`}
                    onClick={() => {
                      if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                        discardCard(pileIndex);
                      } else if (isHuman && isCurrentPlayer) {
                        selectCard('discard', pile.length - 1, pileIndex);
                      }
                    }}
                  >
                    <Card
                      card={pile[pile.length - 1]}
                      isRevealed={true}
                      isSelected={
                        gameState.selectedCard?.source === 'discard' &&
                        gameState.selectedCard.discardPileIndex === pileIndex &&
                        gameState.currentPlayerIndex === playerIndex
                      }
                      canBeGrabbed={isHuman && isCurrentPlayer}
                    />
                  </div>
                ) : (
                  <EmptyCard
                    onClick={() => {
                      if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                        discardCard(pileIndex);
                      }
                    }}
                    canDropCard={isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand'}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
