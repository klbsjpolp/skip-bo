import type { GameState, Card as CardType } from '@/types';
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
    <div className="center-area" data-testid="center-area">
      <div className="bg-layer"/>
      <div className="content-layer flex items-center gap-2 lg:gap-4 h-full">
        {/* Deck Section */}
        <div className="min-w-fit vertical-text">
          Pioche ({gameState.deck.length})
        </div>
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
        <div className="min-w-fit vertical-text">Piles de<br />construction</div>
        <div className="build-piles">
          {gameState.buildPiles.map((pile, index) => {
            const canDropSelectedCard = Boolean(
              gameState.selectedCard &&
              gameState.currentPlayerIndex === 0 &&
              canPlayCard(gameState.selectedCard.card, index, gameState)
            );

            const handleBuildPilePress = () => {
              if (canDropSelectedCard) {
                void playCard(index);
              }
            };

            return (
            <div
              key={`build-${index}`}
              data-build-pile={index}
              role={canDropSelectedCard ? 'button' : undefined}
              tabIndex={canDropSelectedCard ? 0 : undefined}
              aria-label={`Pile de construction ${index + 1}`}
              className={cn(
                "relative drop-indicator build-pile",
                canDropSelectedCard && 'can-drop'
              )}
              onClick={(e) => {
                // Prevent event propagation
                e.stopPropagation();
                handleBuildPilePress();
              }}
              onKeyDown={(e) => {
                if (!canDropSelectedCard) {
                  return;
                }

                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBuildPilePress();
                }
              }}
            >
              {pile.length > 0 ? (
                  <Card
                    hint={`Construction pile ${index + 1}`}
                    card={{
                      ...pile[pile.length - 1],
                      isSkipBo: false, // Force card-normal class for styling
                    }}
                    isRevealed={true}
                    canBeGrabbed={false}
                    displayValue={pile.length.toString()} // Show the sequential position (1-12) instead of card value
                  />
              ) : (
                  <EmptyCard
                    canDropCard={canDropSelectedCard}
                    className={cn(
                      "drop-indicator",
                      canDropSelectedCard && "can-drop"
                    )}
                  />
              )}
            </div>
          )})}
        </div>

        {/* Grow - blank space */}
        <div className="grow"></div>
      </div>
    </div>
  );
}
