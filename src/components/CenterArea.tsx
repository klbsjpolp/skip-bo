import { GameState, Card as CardType } from '@/types';
import { Card } from '@/components/Card';
import {EmptyCard} from "@/components/EmptyCard.tsx";

interface CenterAreaProps {
  gameState: GameState;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  canPlayCard: (card: CardType, buildPileIndex: number, gameState: GameState) => boolean;
}

export function CenterArea({ gameState, playCard, canPlayCard }: CenterAreaProps) {

  return (
    <div className="center-area">
      <div className="flex items-start gap-8">
        {/* Deck */}
        <div className="text-center w-32">
          <h2 className="text-lg font-bold mb-2">
            Pioche ({gameState.deck.length})
          </h2>
          <div className="mx-auto">
            {gameState.deck.length > 0 ? (
              <Card
                card={{ value: 0, isSkipBo: false }}
                isRevealed={false}
                className="shadow-lg"
                canBeGrabbed={false}
              />
            ) : (
              <EmptyCard canDropCard={false} />
            )}
          </div>
        </div>

        {/* Build Piles */}
        <div className="text-center flex-1">
          <h2 className="text-lg font-bold mb-2">Piles de construction</h2>
          <div className="discard-piles">
            {gameState.buildPiles.map((pile, index) => (
              <div
                key={`build-${index}`}
                className={`relative ${gameState.selectedCard && gameState.currentPlayerIndex === 0 && canPlayCard(gameState.selectedCard.card, index, gameState) ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:transform hover:scale-105 transition-transform' : 'cursor-default'}`}
                onClick={async (e) => {
                  // Prevent event propagation
                  e.stopPropagation();
                  
                  // Only allow playing a card if there's a selected card, it's the human player's turn,
                  // and the card can be played on this build pile
                  if (gameState.selectedCard && 
                      gameState.currentPlayerIndex === 0 && 
                      canPlayCard(gameState.selectedCard.card, index, gameState)) {
                    await playCard(index);
                  }
                }}
              >
                {pile.length > 0 ? (
                    <Card
                      card={pile[pile.length - 1]}
                      isRevealed={true}
                      canBeGrabbed={false}
                    />
                ) : (
                    <EmptyCard canDropCard={gameState.selectedCard !== null && gameState.currentPlayerIndex === 0 && canPlayCard(gameState.selectedCard.card, index, gameState)} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
