import type { GameState, Card as CardType } from '@/types';
import { Card } from '@/components/Card';
import {EmptyCard} from "@/components/EmptyCard.tsx";
import { cn } from '@/lib/utils';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';
import {
  getRetreatPileAngle,
  RETREAT_PILE_PREVIEW_LIMIT,
} from '@/lib/retreatPile';

interface CenterAreaProps {
  gameState: GameState;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  canPlayCard: (card: CardType, buildPileIndex: number, gameState: GameState) => boolean;
}

export function CenterArea({ gameState, playCard, canPlayCard }: CenterAreaProps) {
  const { activeAnimations, isCardBeingAnimated } = useCardAnimation();
  const pendingRetreatCardsCount = activeAnimations.filter(
    (animation) => animation.animationType === 'complete',
  ).length;
  const visibleCompletedBuildPileCount = Math.max(
    gameState.completedBuildPiles.length - pendingRetreatCardsCount,
    0,
  );
  const visibleCompletedBuildPiles =
    visibleCompletedBuildPileCount === gameState.completedBuildPiles.length
      ? gameState.completedBuildPiles
      : gameState.completedBuildPiles.slice(0, visibleCompletedBuildPileCount);
  const retreatPreviewStartIndex = Math.max(
    visibleCompletedBuildPileCount - RETREAT_PILE_PREVIEW_LIMIT,
    0,
  );
  const retreatPreviewCards = visibleCompletedBuildPiles.slice(-RETREAT_PILE_PREVIEW_LIMIT);

  return (
    <div className="center-area" data-testid="center-area">
      <div className="bg-layer"/>
      <div className="content-layer flex items-center gap-2 lg:gap-4 h-full flex-wrap">
        <div className="flex items-center gap-2 lg:gap-4" data-testid="center-deck-section">
          <div className="min-w-fit vertical-text" data-testid="center-deck-title">
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
        </div>

        <div className="flex items-center gap-2 lg:gap-4" data-testid="center-build-section">
          <div className="min-w-fit vertical-text" data-testid="center-build-title">
            Piles de<br />construction
          </div>
          <div className="build-piles">
            {gameState.buildPiles.map((pile, index) => {
              const canDropSelectedCard = Boolean(
                gameState.selectedCard &&
                gameState.currentPlayerIndex === 0 &&
                canPlayCard(gameState.selectedCard.card, index, gameState)
              );
              const buildPileIsAnimating = isCardBeingAnimated(
                gameState.currentPlayerIndex,
                'build',
                index,
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
                  {pile.length > 0 && !buildPileIsAnimating ? (
                    <Card
                      hint={`Construction pile ${index + 1}`}
                      card={{
                        ...pile[pile.length - 1],
                        isSkipBo: false,
                      }}
                      isRevealed={true}
                      canBeGrabbed={false}
                      displayValue={pile.length.toString()}
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
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4" data-testid="center-retreat-section">
          <div className="min-w-fit vertical-text" data-testid="retreat-pile-title">
            Retrait ({gameState.completedBuildPiles.length})
          </div>
          <div
            className="retreat-pile-stack"
            data-retreat-pile
            data-testid="retreat-pile"
            aria-label={`Pile de retrait (${gameState.completedBuildPiles.length})`}
          >
            {retreatPreviewCards.length > 0 ? (
              retreatPreviewCards.map((card, index) => {
                const absoluteIndex = retreatPreviewStartIndex + index;

                return (
                  <div
                    key={`retreat-${absoluteIndex}-${card.value}-${card.isSkipBo ? 'skipbo' : 'card'}`}
                    className="retreat-card-shell"
                    style={{
                      zIndex: index + 1,
                      transform: `rotate(${getRetreatPileAngle(absoluteIndex)}deg)`,
                    }}
                  >
                    <Card
                      hint={`Retrait ${absoluteIndex + 1}`}
                      card={card}
                      isRevealed={true}
                      canBeGrabbed={false}
                    />
                  </div>
                );
              })
            ) : (
              <EmptyCard canDropCard={false} />
            )}
          </div>
        </div>

        <div className="grow"></div>
      </div>
    </div>
  );
}
