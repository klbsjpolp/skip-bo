import { GameState, Card as CardType } from '@/types';
import { Card } from '@/components/Card';
import {EmptyCard} from "@/components/EmptyCard.tsx";

interface CenterAreaProps {
  gameState: GameState;
  playCard: (buildPileIndex: number) => { success: boolean; message: string };
  canPlayCard: (card: Card, buildPileIndex: number, gameState: GameState) => boolean;
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
                className={`relative ${gameState.selectedCard && gameState.currentPlayerIndex === 0 && canPlayCard(gameState.selectedCard.card, index, gameState) ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-default'}`}
                onClick={() => {
                  if (gameState.selectedCard && gameState.currentPlayerIndex === 0) {
                    playCard(index);
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
                {/* Pile indicator */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-gray-600 text-white px-1 rounded">
                  {pile.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
