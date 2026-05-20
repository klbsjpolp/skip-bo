import type { Card as CardType, GameState } from '@/types';
import { Card } from '@/components/Card';
import { EmptyCard } from '@/components/EmptyCard.tsx';
import { cn } from '@/lib/utils';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';
import { useDrag } from '@/contexts/useDrag';
import { getRetreatPileAngle, RETREAT_PILE_PREVIEW_LIMIT } from '@/lib/retreatPile';

interface CenterAreaProps {
  gameState: GameState;
  playCard: (buildPileIndex: number) => Promise<{ success: boolean; message: string }>;
  canPlayCard: (card: CardType, buildPileIndex: number, gameState: GameState) => boolean;
}

export function CenterArea({ gameState, playCard, canPlayCard }: CenterAreaProps) {
  const { activeAnimations } = useCardAnimation();
  const { session: dragSession } = useDrag();
  const isDragActive = dragSession !== null;
  // A settled "play" animation whose targetPileLength is 0 means the play
  // landed on a build pile that was just cleared by completion — i.e. the
  // card it carries is already in completedBuildPiles in the committed view.
  // Hide it on the retreat pile until the play animation lands; otherwise it
  // flashes there before the play animation visually delivers it. This
  // closes the microtask gap between commitView and
  // triggerCompletedBuildPileAnimation in useOnlineSkipBoGame.
  const pendingCompletionPlayCount = activeAnimations.filter(
    (animation) =>
      animation.animationType === 'play' &&
      animation.targetSettledInState &&
      animation.targetInfo?.source === 'build' &&
      animation.targetPileLength === 0,
  ).length;
  const pendingRetreatCardsCount =
    activeAnimations.filter((animation) => animation.animationType === 'complete').length + pendingCompletionPlayCount;
  // Keep the deck back visible while draw animations are still leaving the
  // deck. In online mode the server snapshot drops deck.length to 0 before
  // the staggered draw animations finish, which would otherwise flash "Vide".
  const deckIsDealing = activeAnimations.some(
    (animation) => animation.sourceInfo.source === 'deck' && !animation.hasStarted,
  );
  const visibleCompletedBuildPileCount = Math.max(gameState.completedBuildPiles.length - pendingRetreatCardsCount, 0);
  const visibleCompletedBuildPiles =
    visibleCompletedBuildPileCount === gameState.completedBuildPiles.length
      ? gameState.completedBuildPiles
      : gameState.completedBuildPiles.slice(0, visibleCompletedBuildPileCount);
  const retreatPreviewStartIndex = Math.max(visibleCompletedBuildPileCount - RETREAT_PILE_PREVIEW_LIMIT, 0);
  const retreatPreviewCards = visibleCompletedBuildPiles.slice(-RETREAT_PILE_PREVIEW_LIMIT);

  return (
    <div className="center-area" data-testid="center-area">
      <div className="bg-layer" />
      <div className="content-layer flex items-center gap-2 lg:gap-4 h-full flex-wrap">
        <div className="flex items-center gap-2 lg:gap-4" data-testid="center-deck-section">
          <h2 className="min-w-fit vertical-text" data-testid="center-deck-title">
            Pioche ({gameState.deck.length})
          </h2>
          <div className="deck">
            {gameState.deck.length > 0 || deckIsDealing ? (
              <Card hint="Deck" card={{ value: 0, isSkipBo: false }} isRevealed={false} canBeGrabbed={false} />
            ) : (
              <EmptyCard canDropCard={false} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4" data-testid="center-build-section">
          <h2 className="min-w-fit vertical-text" data-testid="center-build-title">
            Piles de
            <br />
            construction
          </h2>
          <div className="build-piles">
            {gameState.buildPiles.map((pile, index) => {
              const canDropFromSelection = Boolean(
                gameState.selectedCard &&
                gameState.currentPlayerIndex === 0 &&
                canPlayCard(gameState.selectedCard.card, index, gameState),
              );
              const canDropFromDrag = isDragActive && dragSession.validBuildPiles.has(index);
              const canDropSelectedCard = isDragActive ? canDropFromDrag : canDropFromSelection;
              const isDragOver =
                canDropFromDrag && dragSession.hovered?.kind === 'build' && dragSession.hovered.index === index;
              const incomingPlayAnimation = activeAnimations.find(
                (animation) =>
                  animation.animationType === 'play' &&
                  animation.targetSettledInState &&
                  animation.targetInfo?.source === 'build' &&
                  animation.targetInfo.index === index,
              );
              const incomingPlayHasSettledInRenderedPile = Boolean(
                incomingPlayAnimation &&
                incomingPlayAnimation.targetPileLength !== undefined &&
                pile.length === incomingPlayAnimation.targetPileLength,
              );
              // True while at least one card is still waiting to depart (in its initialDelay).
              // Becomes false once the last card has left the pile position.
              const buildPileIsCompleting = activeAnimations.some(
                (animation) =>
                  animation.sourceInfo.source === 'build' &&
                  animation.sourceInfo.index === index &&
                  !animation.hasStarted,
              );
              const shouldMaskIncomingPlay = incomingPlayHasSettledInRenderedPile;
              const visiblePileLength = shouldMaskIncomingPlay ? Math.max(pile.length - 1, 0) : pile.length;
              const visibleTopCard = visiblePileLength > 0 ? pile[visiblePileLength - 1] : null;
              const handleBuildPilePress = () => {
                if (canDropSelectedCard) {
                  void playCard(index);
                }
              };

              return (
                <div
                  key={`build-${index}`}
                  data-build-pile={index}
                  data-drop-target={canDropFromDrag ? 'build' : undefined}
                  data-drop-index={canDropFromDrag ? index : undefined}
                  role={canDropSelectedCard ? 'button' : undefined}
                  tabIndex={canDropSelectedCard ? 0 : undefined}
                  aria-label={`Pile de construction ${index + 1}`}
                  className={cn(
                    'relative drop-indicator build-pile',
                    canDropSelectedCard && 'can-drop',
                    isDragOver && 'is-drag-over',
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
                  {visibleTopCard && !buildPileIsCompleting ? (
                    <Card
                      key={`build-top-${index}-${visiblePileLength}`}
                      hint={`Construction pile ${index + 1}`}
                      card={visibleTopCard}
                      isRevealed={true}
                      canBeGrabbed={false}
                      displayValue={visiblePileLength.toString()}
                    />
                  ) : buildPileIsCompleting ? (
                    // Pile cleared in state before animation runs — keep showing the
                    // completed "12" card as a static backdrop while cards fly off.
                    <Card
                      hint={`Construction pile ${index + 1}`}
                      card={{ value: gameState.config.CARD_VALUES_MAX, isSkipBo: false }}
                      isRevealed={true}
                      canBeGrabbed={false}
                      displayValue={gameState.config.CARD_VALUES_MAX.toString()}
                    />
                  ) : shouldMaskIncomingPlay && pile.length === 0 ? (
                    <Card
                      hint={`Construction pile ${index + 1}`}
                      card={{
                        value: gameState.config.CARD_VALUES_MAX - 1,
                        isSkipBo: false,
                      }}
                      isRevealed={true}
                      canBeGrabbed={false}
                      displayValue={(gameState.config.CARD_VALUES_MAX - 1).toString()}
                    />
                  ) : (
                    <EmptyCard
                      canDropCard={canDropSelectedCard}
                      className={cn('drop-indicator', canDropSelectedCard && 'can-drop')}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4" data-testid="center-retreat-section">
          <h2 className="min-w-fit vertical-text" data-testid="retreat-pile-title">
            Retrait ({gameState.completedBuildPiles.length})
          </h2>
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
                    <Card hint={`Retrait ${absoluteIndex + 1}`} card={card} isRevealed={true} canBeGrabbed={false} />
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
