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
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  clearSelection: () => void;
}

export function PlayerArea({ 
  player, 
  playerIndex, 
  title, 
  isCurrentPlayer, 
  gameState,
  selectCard,
  discardCard,
  clearSelection
}: PlayerAreaProps) {
  const isHuman = !player.isAI;
  const handOverlaps = player.hand.length > 4;

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
                onClick={(e) => {
                  // Prevent event propagation
                  e.stopPropagation();
                  
                  // Only allow selection if it's the human player's turn and no card is currently selected
                  if (isHuman && isCurrentPlayer && !gameState.selectedCard) {
                    selectCard('stock', player.stockPile.length - 1);
                  }
                }}
                isSelected={
                  gameState.selectedCard?.source === 'stock' &&
                  gameState.currentPlayerIndex === playerIndex
                }
                canBeGrabbed={isHuman && isCurrentPlayer && !gameState.selectedCard}
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
          <div className={cn(
            "hand-area",
            handOverlaps && "overlap-hand"
          )}>
            {player.hand.map((card, index) => (
              <Card
                key={`hand-${index}`}
                card={card}
                isRevealed={true}
                onClick={(e) => {
                  // Prevent event propagation
                  e.stopPropagation();
                  
                  // Only allow selection if it's the human player's turn
                  // For hand cards, we allow selecting even if another card is selected
                  // This allows the player to change their selection
                  if (isHuman && isCurrentPlayer) {
                    // If this card is already selected, deselect it
                    if (gameState.selectedCard?.source === 'hand' && 
                        gameState.selectedCard.index === index &&
                        gameState.currentPlayerIndex === playerIndex) {
                      // Clear the selection
                      clearSelection();
                    } else {
                      // Select this card
                      selectCard('hand', index);
                    }
                  }
                }}
                isSelected={
                  gameState.selectedCard?.source === 'hand' &&
                  gameState.selectedCard.index === index &&
                  gameState.currentPlayerIndex === playerIndex
                }
                canBeGrabbed={isHuman && isCurrentPlayer}
                overlapIndex={handOverlaps ? index : undefined}
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                        await discardCard(pileIndex);
                      } else if (isHuman && isCurrentPlayer) {
                        selectCard('discard', pile.length - 1, pileIndex);
                      }
                    }}
                  >
                    {pile.map((card, cardIdx) => (
                      <Card
                        key={`discard-${pileIndex}-card-${cardIdx}`}
                        card={card}
                        isRevealed={true}
                        isSelected={
                          gameState.selectedCard?.source === 'discard' &&
                          gameState.selectedCard.discardPileIndex === pileIndex &&
                          gameState.currentPlayerIndex === playerIndex &&
                          cardIdx === pile.length - 1
                        }
                        canBeGrabbed={isHuman && isCurrentPlayer && !gameState.selectedCard && cardIdx === pile.length - 1}
                        stackIndex={cardIdx}
                        // Remove onClick from Card to avoid nested handlers
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCard
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                        await discardCard(pileIndex);
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
