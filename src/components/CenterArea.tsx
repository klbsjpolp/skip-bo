import { GameState, Card as CardType } from '@/types';
import { Card } from '@/components/Card';
import {EmptyCard} from "@/components/EmptyCard.tsx";
import { cn } from '@/lib/utils';

interface CenterAreaProps {
  gameState: GameState;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  canPlayCard: (card: CardType, buildPileIndex: number, gameState: GameState) => boolean;
}

export function CenterArea({ gameState, playCard, canPlayCard }: CenterAreaProps) {

  return (
    <div className="center-area">
      <div className="bg-layer"/>
      <div className="content-layer flex items-center gap-2 lg:gap-4 h-full">
        {/* Deck Section */}
        <h3 className="min-w-fit vertical-text">
          Pioche ({gameState.deck.length})
        </h3>
          <div className="deck">
          {gameState.deck.length > 0 ? (
            <Card
              hint="Deck"
              card={{ value: 0, isSkipBo: false }}
              isRevealed={false}
              canBeGrabbed={false}
            />
          ) : (
            <EmptyCard canDropCard={false} />
          )}
        </div>

        {/* Build Piles Section */}
        <h3 className="min-w-fit vertical-text">Piles de<br />construction</h3>
        <div className="build-piles">
          {gameState.buildPiles.map((pile, index) => (
            <div
              key={`build-${index}`}
              data-build-pile={index}
              className={cn(
                "relative drop-indicator build-pile",
                gameState.selectedCard && gameState.currentPlayerIndex === 0 && canPlayCard(gameState.selectedCard.card, index, gameState)
                  && 'can-drop'
              )}
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
                    hint={`Construction pile ${index + 1}`}
                    card={pile[pile.length - 1]}
                    isRevealed={true}
                    canBeGrabbed={false}
                    displayValue={pile.length.toString()} // Show the sequential position (1-12) instead of card value
                  />
              ) : (
                  <EmptyCard
                    canDropCard={gameState.selectedCard !== null && gameState.currentPlayerIndex === 0 && canPlayCard(gameState.selectedCard.card, index, gameState)}
                    className={cn(
                      "drop-indicator",
                      gameState.selectedCard && gameState.currentPlayerIndex === 0 && canPlayCard(gameState.selectedCard.card, index, gameState) && "can-drop"
                    )}
                  />
              )}
            </div>
          ))}
        </div>

        {/* Grow - blank space */}
        <div className="grow"></div>
      </div>
    </div>
  );
}
