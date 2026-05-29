import type { Card as CardType, GameState, MoveResult, Player } from '@/types';
import type { CSSProperties, MouseEventHandler } from 'react';

import { Card } from '@/components/Card';
import { EmptyCard } from '@/components/EmptyCard.tsx';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';
import { useIsDragSource } from '@/contexts/useDrag';
import { useDraggableCard } from '@/hooks/useDraggableCard';
import { cn } from '@/lib/utils';

export interface StockPileProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<MoveResult>;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  clearSelection: () => void;
}

const isHiddenMultiplayerCard = (card: CardType | null | undefined): card is CardType =>
  card !== null && card !== undefined && card.value === 0 && !card.isSkipBo;

export function StockPile({
  player,
  playerIndex,
  isCurrentPlayer,
  gameState,
  selectCard,
  playCard,
  discardCard,
  clearSelection,
}: StockPileProps) {
  const { isCardBeingAnimated } = useCardAnimation();
  const isHuman = !player.isAI;
  const stockProgressHeight = `${(player.stockPile.length / gameState.config.STOCK_SIZE) * 100}%`;

  const stockPileOnClick: MouseEventHandler = (e) => {
    e.stopPropagation();

    if (isHuman && isCurrentPlayer) {
      if (gameState.selectedCard?.source === 'stock' && gameState.currentPlayerIndex === playerIndex) {
        clearSelection();
      } else {
        selectCard('stock', player.stockPile.length - 1);
      }
    }
  };

  return (
    <div className="flex items-center relative gap-2" style={{ '--card-rotate': '0deg' } as CSSProperties}>
      <h2 className="vertical-text">Talon ({player.stockPile.length})</h2>
      {player.stockPile.length > 0 ? (
        <div className="relative h-card w-card stock-pile">
          {/* Placeholder slot behind the stock top card so the slot stays
            visible while the top card is animating to a build / discard
            pile. The label is hidden because there's a real card on top in
            the normal case; the empty-pile case has its own EmptyCard
            below. */}
          <EmptyCard canDropCard={false} hideLabel className="absolute inset-0" />
          {isCardBeingAnimated(playerIndex, 'stock', player.stockPile.length - 1) ? (
            player.stockPile.length > 1 ? (
              <Card
                hint={player.stockPile.length === 2 ? 'Second card in stock' : 'Second card in stock (hidden)'}
                card={player.stockPile[player.stockPile.length - 2]}
                isRevealed={!isHiddenMultiplayerCard(player.stockPile[player.stockPile.length - 2])}
                canBeGrabbed={false}
              />
            ) : null
          ) : isHuman && isCurrentPlayer && player.stockPile[player.stockPile.length - 1] ? (
            <DraggableStockTop
              card={player.stockPile[player.stockPile.length - 1]}
              stockTopIndex={player.stockPile.length - 1}
              playerIndex={playerIndex}
              gameState={gameState}
              selectCard={selectCard}
              playCard={playCard}
              discardCard={discardCard}
              onClick={stockPileOnClick}
            />
          ) : (
            <Card
              hint={player.stockPile.length === 1 ? 'Top card in stock' : 'Top card in stock (hidden)'}
              card={player.stockPile[player.stockPile.length - 1]}
              isRevealed={true}
              onClick={stockPileOnClick}
              isSelected={
                gameState.selectedCard?.source === 'stock' &&
                gameState.selectedCard.index === player.stockPile.length - 1 &&
                gameState.currentPlayerIndex === playerIndex
              }
              canBeGrabbed={isHuman && isCurrentPlayer}
              className="relative z-10"
            />
          )}
        </div>
      ) : (
        <EmptyCard />
      )}
      <div className="w-1 bg-muted flex ml-1 rounded-t-sm h-card stock-pile-indicator">
        <div
          className="w-1 self-end rounded-t-sm bg-primary transition-[height] duration-300 ease-out motion-reduce:transition-none stock-pile-progress"
          style={{
            height: stockProgressHeight,
          }}
        ></div>
      </div>
    </div>
  );
}

interface DraggableStockTopProps {
  card: CardType;
  stockTopIndex: number;
  playerIndex: number;
  gameState: GameState;
  selectCard: StockPileProps['selectCard'];
  playCard: StockPileProps['playCard'];
  discardCard: StockPileProps['discardCard'];
  onClick: MouseEventHandler;
}

function DraggableStockTop({
  card,
  stockTopIndex,
  playerIndex,
  gameState,
  selectCard,
  playCard,
  discardCard,
  onClick,
}: DraggableStockTopProps) {
  const source = { kind: 'stock' as const, index: stockTopIndex };
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
      hint="Top card in stock"
      card={card}
      isRevealed={true}
      onClick={onClick}
      isSelected={
        gameState.selectedCard?.source === 'stock' &&
        gameState.selectedCard.index === stockTopIndex &&
        gameState.currentPlayerIndex === playerIndex
      }
      canBeGrabbed={true}
      className={cn('relative z-10', isDragging && 'is-drag-source')}
      extraProps={draggable}
    />
  );
}
