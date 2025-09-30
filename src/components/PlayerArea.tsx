import {Player, GameState, Card as CardType} from '@/types';
import {Card} from '@/components/Card';
import {cn} from '@/lib/utils';
import {EmptyCard} from "@/components/EmptyCard.tsx";
import {Fragment, MouseEventHandler, useCallback} from "react";
import {useCardAnimation} from "@/contexts/useCardAnimation.ts";

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
  return (
    <div className={cn(
      "player-area ring-3",
      isCurrentPlayer && "active-turn"
    )}>
      <div className="bg-layer"/>
      <div className="content-layer flex items-center gap-2 lg:gap-4 h-full flex-wrap">
        <StockPile player={player} playerIndex={playerIndex} isCurrentPlayer={isCurrentPlayer} gameState={gameState}
                   selectCard={selectCard} clearSelection={clearSelection}/>
        <HandSection player={player} playerIndex={playerIndex} isCurrentPlayer={isCurrentPlayer} gameState={gameState}
                     selectCard={selectCard} clearSelection={clearSelection}/>
        {/* Grow - blank space */}
        <div className="grow"></div>
        <DiscardPiles player={player} playerIndex={playerIndex} isCurrentPlayer={isCurrentPlayer} gameState={gameState}
                      discardCard={discardCard} selectCard={selectCard} clearSelection={clearSelection}/>
      </div>
    </div>
  );
}

interface DiscardPileProps {
  player: Player,
  playerIndex: number,
  isCurrentPlayer: boolean,
  gameState: GameState,
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void,
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>,
  clearSelection: () => void,
  pile: CardType[],
  pileIndex: number
}

function DiscardPile({
                       pile,
                       pileIndex,
                       player,
                       playerIndex,
                       isCurrentPlayer,
                       gameState,
                       selectCard,
                       discardCard,
                       clearSelection
                     }: DiscardPileProps) {
  const {isCardBeingAnimated} = useCardAnimation();
  const isHuman = !player.isAI;

  const computedPiles = pile.map((card, cardIdx) => {
    // Hide the top card if it's being animated
    const isTopCard = cardIdx === pile.length - 1;
    const isAnimated = isTopCard && isCardBeingAnimated(playerIndex, 'discard', cardIdx, pileIndex);

    return {card, cardIdx, isAnimated, key: `discard-${pileIndex}-card-${cardIdx}`};
  });

  return <div className={cn(
    "drop-indicator discard-pile-stack",
    isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand' && "can-drop"
  )} data-pile-index={pileIndex}
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
    style={{height: `calc(var(--card-height) + ${(pile.length <= 1 ? 0 : pile.length - 1) * 20}px)`}}
  >
    {computedPiles.length === 0 && <EmptyCard/>}
    {computedPiles.map(({card, cardIdx, isAnimated, key}) => {
      if (isAnimated) {
        const fakeCard = <div key={key} className="card opacity-0 pointer-events-none"
                             style={{top: `${cardIdx * 20}px`, zIndex: cardIdx}}/>
        if (cardIdx === 0)
          return <Fragment key={key}>
            <EmptyCard/>
            {fakeCard}
          </Fragment>
        else
          return fakeCard
      } else
        return <Card
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
    })}
  </div>;
}

interface DiscardPilesProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  clearSelection: () => void;
}

function DiscardPiles({
                        player,
                        playerIndex,
                        isCurrentPlayer,
                        gameState,
                        selectCard,
                        discardCard,
                        clearSelection
                      }: DiscardPilesProps) {

  // @ts-expect-error setting variable in style
  return <div className="flex items-center gap-2" style={{"--card-rotate": "0deg"}}>
    <h3 className="min-w-fit vertical-text">Défausses</h3>
    <div className="discard-piles self-start">
      {player.discardPiles.map((pile, pileIndex) => (
        <DiscardPile key={`discard-${pileIndex}`} pile={pile} pileIndex={pileIndex} playerIndex={playerIndex}
                     isCurrentPlayer={isCurrentPlayer} gameState={gameState} selectCard={selectCard}
                     discardCard={discardCard} clearSelection={clearSelection} player={player}/>
      ))}
    </div>
  </div>;
}

interface StockPileProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  clearSelection: () => void;
}

function StockPile({player, playerIndex, isCurrentPlayer, gameState, selectCard, clearSelection}: StockPileProps) {
  const {isCardBeingAnimated} = useCardAnimation();
  const isHuman = !player.isAI;

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


  // @ts-expect-error setting variable in style
  return <div className="flex items-center relative gap-2" style={{"--card-rotate": "0deg"}}>
    <h3 className="vertical-text">Talon ({player.stockPile.length})</h3>
    {player.stockPile.length > 0 ? (
      <div className="relative w-full stock-pile">
        {/* Show the top card unless it's being animated */}
        {isCardBeingAnimated(playerIndex, 'stock', player.stockPile.length - 1)
          ? (player.stockPile.length > 1 ? (
            <Card
              hint={player.stockPile.length === 2 ? 'Second card in stock' : 'Second card in stock (hidden)'}
              card={player.stockPile[player.stockPile.length - 2]}
              isRevealed={true}
              canBeGrabbed={false}
            />
          ) : (
            <EmptyCard/>
          ))
          : (
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
      <EmptyCard/>
    )}
    {/* Stock Pile Indicator */}
    <div className="w-1 bg-primary-foreground flex ml-1 rounded-t-sm card-height">
      <div
        className="w-1 self-end rounded-t-sm bg-primary"
        style={{
          height: `${(player.stockPile.length / gameState.config.STOCK_SIZE) * 100}%`,
        }}
      ></div>
    </div>
  </div>;
}

interface HandSectionProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  clearSelection: () => void;
}

function HandSection({player, playerIndex, isCurrentPlayer, gameState, selectCard, clearSelection}: HandSectionProps) {
  const {isCardBeingAnimated} = useCardAnimation();
  const isHuman = !player.isAI;
  const handOverlaps = player.hand.length > 4;

  const handCardOnClick: MouseEventHandler = useCallback((e) => {
    // Prevent event propagation
    e.stopPropagation();

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


  return <div className="flex items-center gap-2">
    <h3 className="vertical-text">Main</h3>
    <div className={cn(
      "hand-area",
      handOverlaps && "overlap-hand"
    )}>
      {player.hand.map((card, index) => (
        <div className='card-holder inline-flex flex-nowrap w-[calc(var(--hand-area-width)/5)] h-(--card-height)'
             key={`hand-${index}`} data-card-index={index} style={{
          // @ts-expect-error custom var
          '--card-rotate': `${(index - Math.floor(5 / 2)) * 4}deg` // −8°..+8°
        }}>
          {/* Hide cards that are being animated OUT of the hand (discard/play animations) */}
          {/* Hide cards that are being animated INTO the hand (draw animations) until animation completes */}
          {/* Only show cards that are in the hand normally and not being animated */}
          {isCardBeingAnimated(playerIndex, 'hand', index) || isCardBeingAnimated(playerIndex, 'deck', index) ? (
            <div className="card opacity-0 pointer-events-none"/>
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
  </div>;
}