import type { Card as CardType, GameState, MoveResult, Player } from '@skipbo/game-core';
import type { MouseEventHandler } from 'react';

import { Card } from '@/components/Card';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';
import { useIsDragSource } from '@/contexts/useDrag';
import { useDraggableCard } from '@/hooks/useDraggableCard';
import { cn } from '@/lib/utils';
import { HAND_Y_OFFSETS } from '@/utils/cardPositions';

export interface HandSectionProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<MoveResult>;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  clearSelection: () => void;
}

export function HandSection({
  player,
  playerIndex,
  isCurrentPlayer,
  gameState,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
}: HandSectionProps) {
  const { isCardBeingAnimated } = useCardAnimation();
  const isHuman = !player.isAI;
  const handOverlaps = player.hand.length > 4;

  const handCardOnClick: MouseEventHandler = (e) => {
    e.stopPropagation();

    if (isHuman && isCurrentPlayer) {
      const index = parseInt(e.currentTarget.parentElement?.getAttribute('data-card-index') || '');
      if (
        gameState.selectedCard?.source === 'hand' &&
        gameState.selectedCard.index === index &&
        gameState.currentPlayerIndex === playerIndex
      ) {
        clearSelection();
      } else {
        selectCard('hand', index);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <h2 className="vertical-text">Main</h2>
      <div className={cn('hand-area', handOverlaps && 'overlap-hand')}>
        {player.hand.map((card, index) => (
          <div
            className="card-holder inline-flex flex-nowrap w-[calc(var(--hand-area-width)/5)] h-card"
            key={`hand-${index}`}
            data-card-index={index}
            style={{
              // @ts-expect-error custom var
              '--card-rotate': `${(index - Math.floor(5 / 2)) * 4}deg`,
            }}
          >
            {isCardBeingAnimated(playerIndex, 'hand', index) || isCardBeingAnimated(playerIndex, 'deck', index) ? (
              <div
                className="card opacity-0 pointer-events-none"
                style={
                  handOverlaps
                    ? {
                        left: `calc(${index} * (var(--card-width) - 10px))`,
                        top: `${HAND_Y_OFFSETS[index]}px`,
                        zIndex: index,
                      }
                    : undefined
                }
              />
            ) : isHuman && isCurrentPlayer && card ? (
              <DraggableHandCard
                card={card}
                index={index}
                playerIndex={playerIndex}
                gameState={gameState}
                selectCard={selectCard}
                playCard={playCard}
                discardCard={discardCard}
                onClick={handCardOnClick}
                overlapIndex={handOverlaps ? index : undefined}
              />
            ) : (
              <Card
                hint={`Hand card ${index + 1}`}
                card={card}
                isRevealed={isHuman}
                onClick={handCardOnClick}
                isSelected={
                  gameState.selectedCard?.source === 'hand' &&
                  gameState.selectedCard.index === index &&
                  gameState.currentPlayerIndex === playerIndex
                }
                canBeGrabbed={isHuman && isCurrentPlayer}
                overlapIndex={handOverlaps ? index : undefined}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DraggableHandCardProps {
  card: CardType;
  index: number;
  playerIndex: number;
  gameState: GameState;
  selectCard: HandSectionProps['selectCard'];
  playCard: HandSectionProps['playCard'];
  discardCard: HandSectionProps['discardCard'];
  onClick: MouseEventHandler;
  overlapIndex?: number;
}

function DraggableHandCard({
  card,
  index,
  playerIndex,
  gameState,
  selectCard,
  playCard,
  discardCard,
  onClick,
  overlapIndex,
}: DraggableHandCardProps) {
  const source = { kind: 'hand' as const, index };
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
  return (
    <Card
      hint={`Hand card ${index + 1}`}
      card={card}
      isRevealed
      onClick={onClick}
      isSelected={
        gameState.selectedCard?.source === 'hand' &&
        gameState.selectedCard.index === index &&
        gameState.currentPlayerIndex === playerIndex
      }
      canBeGrabbed
      overlapIndex={overlapIndex}
      className={isDragging ? 'is-drag-source' : undefined}
      extraProps={draggable}
    />
  );
}
