import {Player, GameState} from '@/types';
import { Card } from '@/components/Card';
import { cn } from '@/lib/utils';
import {EmptyCard} from "@/components/EmptyCard.tsx";
import { useCardAnimation } from '@/contexts/CardAnimationContext';
import {MouseEventHandler, useCallback} from "react";

interface PlayerAreaProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  clearSelection: () => void;
}

export function PlayerArea({
  player,
  playerIndex,
  isCurrentPlayer,
  gameState,
  selectCard,
  discardCard,
  clearSelection
}: PlayerAreaProps) {
  const isHuman = !player.isAI;
  const handOverlaps = player.hand.length > 4;
  const { isCardBeingAnimated } = useCardAnimation();

  const stockPileOnClick: MouseEventHandler = useCallback((e) => {
    // Prevent event propagation
    e.stopPropagation();

    // Only allow selection if it's the human player's turn
    if (isHuman && isCurrentPlayer) {
      // If this card is already selected, deselect it
      if (gameState.selectedCard?.source === 'stock' &&
        gameState.currentPlayerIndex === playerIndex) {
        // Clear the selection
        clearSelection();
      } else {
        // Select this card
        selectCard('stock', player.stockPile.length - 1);
      }
    }
  }, [clearSelection, gameState.currentPlayerIndex, gameState.selectedCard?.source, isCurrentPlayer, isHuman, player.stockPile.length, playerIndex, selectCard])

  const handCardOnClick: MouseEventHandler = useCallback((e) => {
    // Prevent event propagation
    e.stopPropagation();
    console.log('handCardOnClick', 'isHuman', isHuman,'isCurrentPlayer',isCurrentPlayer, e.currentTarget.parentElement?.getAttribute('data-card-index'))

    // Only allow selection if it's the human player's turn
    // For hand cards, we allow selecting even if another card is selected
    // This allows the player to change their selection
    if (isHuman && isCurrentPlayer) {
      const index = parseInt(e.currentTarget.parentElement?.getAttribute('data-card-index') || '');
      // If this card is already selected, deselect it
      if (gameState.selectedCard?.source === 'hand' &&
        gameState.selectedCard.index === index &&
        gameState.currentPlayerIndex === playerIndex) {
        // Clear the selection
        clearSelection();
      } else {
        // Select this card
        selectCard('hand', index);
      }
    }
  }, [clearSelection, gameState.currentPlayerIndex, gameState.selectedCard?.index, gameState.selectedCard?.source, isCurrentPlayer, isHuman, playerIndex, selectCard]);

  return (
    <div className={cn(
      "player-area", "flex items-center gap-4 h-full flex-wrap",
      isCurrentPlayer && "ring-3 ring-primary",
    )}>
      {/* Stock Pile Section */}
      <div className="w-24 flex items-center relative gap-2">
        <h3 className="vertical-text">Talon ({player.stockPile.length})</h3>
        {player.stockPile.length > 0 ? (
          <div className="relative w-full">
            {/* Always show the second card underneath if available */}
            {player.stockPile.length > 1 && (
              <Card
                hint={player.stockPile.length === 2 ? 'Second card in stock' : 'Second card in stock (hidden)'}
                card={player.stockPile[player.stockPile.length - 2]}
                isRevealed={true}
                canBeGrabbed={false}
                className="absolute top-1 left-1 opacity-60"
              />
            )}
            
            {/* Show the top card unless it's being animated */}
            {!isCardBeingAnimated(playerIndex, 'stock', player.stockPile.length - 1) && (
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
        {/* Stock Pile Indicator */}
        <div className="w-1 bg-primary-foreground flex ml-1 rounded-t-sm card-height">
          <div
            className="w-full self-end rounded-t-sm bg-primary"
            style={{
              height: `${Math.max(5, (player.stockPile.length / gameState.config.STOCK_SIZE) * 100)}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Hand Section */}
      <div className="flex items-center gap-2">
        <h3 className="vertical-text">Main</h3>
        <div className={cn(
          "hand-area",
          handOverlaps && "overlap-hand"
        )}>
          {player.hand.map((card, index) => (
            <div className='card-holder' key={`hand-${index}`} data-card-index={index}>
              {/* Hide cards that are being animated OUT of the hand (discard/play animations) */}
              {/* Hide cards that are being animated INTO the hand (draw animations) until animation completes */}
              {/* Only show cards that are in the hand normally and not being animated */}
              {isCardBeingAnimated(playerIndex, 'hand', index) || isCardBeingAnimated(playerIndex, 'deck', index) ? (
                <div className="card opacity-0 pointer-events-none" />
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

      {/* Grow - blank space */}
      <div className="grow"></div>

      {/* Discard Piles Section */}
      <div className="flex items-center gap-2">
        <h3 className="min-w-fit vertical-text">Défausses</h3>
        <div className="discard-piles self-start">
          {player.discardPiles.map((pile, pileIndex) => (
            <div key={`discard-${pileIndex}`} className="discard-pile-stack" data-pile-index={pileIndex}>
              {pile.length > 0 ? (
                <div
                  className={cn(
                    "drop-indicator",
                    isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand' && "can-drop cursor-pointer",
                    !isHuman || !isCurrentPlayer || gameState.selectedCard?.source !== 'hand' ? 'cursor-default' : ''
                  )}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                      await discardCard(pileIndex);
                    } else if (isHuman && isCurrentPlayer) {
                      // If this discard pile is already selected, deselect it
                      if (gameState.selectedCard?.source === 'discard' &&
                          gameState.selectedCard.discardPileIndex === pileIndex &&
                          gameState.currentPlayerIndex === playerIndex) {
                        // Clear the selection
                        clearSelection();
                      } else {
                        // Select this discard pile
                        selectCard('discard', pile.length - 1, pileIndex);
                      }
                    }
                  }}
                >
                  <EmptyCard />
                  {pile.map((card, cardIdx) => {
                    // Hide the top card if it's being animated
                    const isTopCard = cardIdx === pile.length - 1;
                    const isAnimated = isTopCard && isCardBeingAnimated(playerIndex, 'discard', cardIdx, pileIndex);

                    return isAnimated ? (
                      <div key={`discard-${pileIndex}-card-${cardIdx}`} className="card opacity-0 pointer-events-none" style={{ top: `${cardIdx * 20}px`, zIndex: cardIdx }} />
                    ) : (
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
                        canBeGrabbed={isHuman && isCurrentPlayer && cardIdx === pile.length - 1}
                        stackIndex={cardIdx}
                        // Remove onClick from Card to avoid nested handlers
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyCard
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
                      await discardCard(pileIndex);
                    }
                  }}
                  canDropCard={isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand'}
                  className={cn(
                    "drop-indicator",
                    isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand' && "can-drop"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
