import type { Card as CardType, GameState, MoveResult, Player } from '@/types';
import type { CSSProperties } from 'react';

import { Card } from '@/components/Card';
import { EmptyCard } from '@/components/EmptyCard.tsx';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';
import { useDrag, useIsDragSource } from '@/contexts/useDrag';
import { useDraggableCard } from '@/hooks/useDraggableCard';
import { cn } from '@/lib/utils';

export interface DiscardPilesProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<MoveResult>;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  clearSelection: () => void;
}

export function DiscardPiles({
  player,
  playerIndex,
  isCurrentPlayer,
  gameState,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
}: DiscardPilesProps) {
  return (
    <div className="flex items-center gap-2" style={{ '--card-rotate': '0deg' } as CSSProperties}>
      <h2 className="min-w-fit vertical-text">Défausses</h2>
      <div className="discard-piles">
        {player.discardPiles.map((pile, pileIndex) => (
          <DiscardPile
            key={`discard-${pileIndex}`}
            pile={pile}
            pileIndex={pileIndex}
            playerIndex={playerIndex}
            isCurrentPlayer={isCurrentPlayer}
            gameState={gameState}
            selectCard={selectCard}
            playCard={playCard}
            discardCard={discardCard}
            clearSelection={clearSelection}
            player={player}
          />
        ))}
      </div>
    </div>
  );
}

interface DiscardPileProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: DiscardPilesProps['selectCard'];
  playCard: DiscardPilesProps['playCard'];
  discardCard: DiscardPilesProps['discardCard'];
  clearSelection: () => void;
  pile: CardType[];
  pileIndex: number;
}

function DiscardPile({
  pile,
  pileIndex,
  player,
  playerIndex,
  isCurrentPlayer,
  gameState,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
}: DiscardPileProps) {
  const { activeAnimations, isCardBeingAnimated } = useCardAnimation();
  const { session: dragSession } = useDrag();
  const isHuman = !player.isAI;
  const hasIncomingDiscardAnimation = activeAnimations.some(
    (animation) =>
      animation.animationType === 'discard' &&
      animation.targetSettledInState &&
      animation.targetInfo?.source === 'discard' &&
      animation.targetInfo.playerIndex === playerIndex &&
      animation.targetInfo.discardPileIndex === pileIndex &&
      animation.targetPileLength !== undefined &&
      pile.length === animation.targetPileLength,
  );

  const computedPiles = pile.map((card, cardIdx) => {
    const isTopCard = cardIdx === pile.length - 1;
    const isAnimated =
      isTopCard && (isCardBeingAnimated(playerIndex, 'discard', cardIdx, pileIndex) || hasIncomingDiscardAnimation);

    return { card, cardIdx, isAnimated, key: `discard-${pileIndex}-card-${cardIdx}` };
  });

  // True while the pile's only card is still masked behind the flying
  // animated replica — visually the pile still reads as empty, so the
  // "Vide" placeholder should stay shown rather than flip to hidden and
  // back, which would otherwise mount a second empty-card on top of it.
  const soleCardMasked = computedPiles.length === 1 && computedPiles[0].isAnimated;

  const canInteract = isHuman && isCurrentPlayer;

  const handleDiscardPilePress = () => {
    if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
      void discardCard(pileIndex);
    } else if (isHuman && isCurrentPlayer) {
      if (
        gameState.selectedCard?.source === 'discard' &&
        gameState.selectedCard.discardPileIndex === pileIndex &&
        gameState.currentPlayerIndex === playerIndex
      ) {
        clearSelection();
      } else {
        selectCard('discard', pile.length - 1, pileIndex);
      }
    }
  };

  const canDropFromSelection = isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand';
  const isDragActive = dragSession !== null;
  const canDropFromDrag =
    isDragActive &&
    dragSession.validDiscardPiles.has(pileIndex) &&
    playerIndex === gameState.currentPlayerIndex &&
    isHuman;
  const canDrop = isDragActive ? canDropFromDrag : canDropFromSelection;
  const isDragOver =
    canDropFromDrag && dragSession?.hovered?.kind === 'discard' && dragSession.hovered.index === pileIndex;

  return (
    <div
      className={cn('drop-indicator discard-pile-stack relative', canDrop && 'can-drop', isDragOver && 'is-drag-over')}
      data-pile-index={pileIndex}
      data-drop-target={canDropFromDrag ? 'discard' : undefined}
      data-drop-index={canDropFromDrag ? pileIndex : undefined}
      role={canInteract ? 'button' : undefined}
      tabIndex={canInteract ? 0 : undefined}
      aria-label={`Défausse ${pileIndex + 1}`}
      onClick={(e) => {
        e.stopPropagation();
        handleDiscardPilePress();
      }}
      onKeyDown={(e) => {
        if (!canInteract) {
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDiscardPilePress();
        }
      }}
      style={{
        height: `calc(var(--card-height) + var(--stack-diff) * ${pile.length <= 1 ? 0 : pile.length - 1})`,
      }}
    >
      <EmptyCard
        canDropCard={computedPiles.length === 0}
        hideLabel={computedPiles.length > 0 && !soleCardMasked}
        className="absolute inset-0"
      />
      {computedPiles.map(({ card, cardIdx, isAnimated, key }) => {
        if (isAnimated) {
          return (
            <div
              key={key}
              className="card opacity-0 pointer-events-none"
              style={{ top: `${cardIdx * 20}px`, zIndex: cardIdx }}
            />
          );
        }
        const isTop = cardIdx === pile.length - 1;
        if (isTop && isHuman && isCurrentPlayer) {
          return (
            <DraggableDiscardTop
              key={`discard-${pileIndex}-card-${cardIdx}`}
              card={card}
              pileIndex={pileIndex}
              cardIndex={cardIdx}
              playerIndex={playerIndex}
              gameState={gameState}
              selectCard={selectCard}
              playCard={playCard}
              discardCard={discardCard}
            />
          );
        }
        return (
          <Card
            hint={`discard pile ${pileIndex + 1}, card ${cardIdx + 1}`}
            key={`discard-${pileIndex}-card-${cardIdx}`}
            card={card}
            isRevealed={true}
            isSelected={
              gameState.selectedCard?.source === 'discard' &&
              gameState.selectedCard.discardPileIndex === pileIndex &&
              gameState.currentPlayerIndex === playerIndex &&
              cardIdx === pile.length - 1
            }
            canBeGrabbed={isHuman && isCurrentPlayer && isTop}
            stackIndex={cardIdx}
          />
        );
      })}
    </div>
  );
}

interface DraggableDiscardTopProps {
  card: CardType;
  pileIndex: number;
  cardIndex: number;
  playerIndex: number;
  gameState: GameState;
  selectCard: DiscardPileProps['selectCard'];
  playCard: DiscardPileProps['playCard'];
  discardCard: DiscardPileProps['discardCard'];
}

function DraggableDiscardTop({
  card,
  pileIndex,
  cardIndex,
  playerIndex,
  gameState,
  selectCard,
  playCard,
  discardCard,
}: DraggableDiscardTopProps) {
  const source = { kind: 'discard' as const, index: cardIndex, discardPileIndex: pileIndex };
  const draggable = useDraggableCard({
    source,
    card,
    enabled: true,
    gameState,
    selectCard,
    playCard,
    discardCard,
  });
  const isDragging = useIsDragSource(source);
  const isSelected =
    gameState.selectedCard?.source === 'discard' &&
    gameState.selectedCard.discardPileIndex === pileIndex &&
    gameState.currentPlayerIndex === playerIndex;
  return (
    <Card
      hint={`discard pile ${pileIndex + 1}, card ${cardIndex + 1}`}
      card={card}
      isRevealed={true}
      isSelected={isSelected}
      canBeGrabbed={true}
      stackIndex={cardIndex}
      className={isDragging ? 'is-drag-source' : undefined}
      extraProps={draggable}
    />
  );
}
