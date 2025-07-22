import { GameState } from '@/types';
import { Card } from '@/components/Card';
import {EmptyCard} from "@/components/EmptyCard.tsx";

interface CenterAreaProps {
  gameState: GameState;
  playCard: (buildPileIndex: number) => { success: boolean; message: string };
}

export function CenterArea({ gameState, playCard }: CenterAreaProps) {

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
              />
            ) : (
              <EmptyCard />
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
                className="relative cursor-pointer"
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
                    className="hover:ring-2 hover:ring-blue-400"
                  />
                ) : (
                  <EmptyCard />
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
