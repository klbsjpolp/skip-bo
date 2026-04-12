import type {Card as CardType, GameState, Player} from '@/types';
import {Card} from '@/components/Card';
import {cn} from '@/lib/utils';
import {EmptyCard} from "@/components/EmptyCard.tsx";
import type {MouseEventHandler} from "react";
import {Fragment} from "react";
import {useCardAnimation} from "@/contexts/useCardAnimation.ts";
import {VictoryEffects} from '@/components/VictoryEffects';

export interface PlayerAreaProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  isWinner: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  discardCard: (discardPileIndex: number) => Promise<{ success: boolean; message: string }>;
  clearSelection: () => void;
}

export function PlayerArea({
                             player,
                             playerIndex,
                             isCurrentPlayer,
                             isWinner,
                             gameState,
                             selectCard,
                             discardCard,
                             clearSelection
                           }: PlayerAreaProps) {
  return (
    <div className={cn(
      "player-area ring-3",
      isCurrentPlayer && "active-turn",
      isWinner && "winner"
    )}
      data-player-type={player.isAI ? 'ai' : 'human'}
      data-player-index={playerIndex}
      data-player-state={isWinner ? 'winner' : isCurrentPlayer ? 'active' : 'idle'}
      data-testid={player.isAI ? 'ai-player-area' : 'human-player-area'}
      aria-label={player.isAI ? 'Zone du joueur IA' : 'Zone du joueur humain'}
    >
      <div className="bg-layer"/>
      {isWinner && <VictoryEffects />}
      <div className="content-layer flex items-center gap-2 lg:gap-4 h-full flex-wrap">
        {player.name && <div className="vertical-text border-l border-primary">{player.name}</div>}
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
  const {activeAnimations, isCardBeingAnimated} = useCardAnimation();
  const isHuman = !player.isAI;
  const hasIncomingDiscardAnimation = activeAnimations.some(
    (animation) =>
      animation.animationType === 'discard' &&
      animation.targetSettledInState &&
      animation.targetInfo?.source === 'discard' &&
      animation.targetInfo.playerIndex === playerIndex &&
      animation.targetInfo.discardPileIndex === pileIndex,
  );

  const computedPiles = pile.map((card, cardIdx) => {
    // Hide the top card if it's being animated
    const isTopCard = cardIdx === pile.length - 1;
    const isAnimated = isTopCard && (
      isCardBeingAnimated(playerIndex, 'discard', cardIdx, pileIndex) ||
      hasIncomingDiscardAnimation
    );

    return {card, cardIdx, isAnimated, key: `discard-${pileIndex}-card-${cardIdx}`};
  });

  const canInteract = isHuman && isCurrentPlayer;

  const handleDiscardPilePress = () => {
    if (isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand') {
      void discardCard(pileIndex);
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
  };

  return <div className={cn(
    "drop-indicator discard-pile-stack",
    isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand' && "can-drop"
  )} data-pile-index={pileIndex}
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

export function DiscardPiles({
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
    <div className="min-w-fit vertical-text">Défausses</div>
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

const isHiddenMultiplayerCard = (card: CardType | null | undefined): card is CardType =>
  card !== null && card !== undefined && card.value === 0 && !card.isSkipBo;

export function StockPile({
                            player,
                            playerIndex,
                            isCurrentPlayer,
                            gameState,
                            selectCard,
                            clearSelection
                          }: StockPileProps) {
  const {isCardBeingAnimated} = useCardAnimation();
  const isHuman = !player.isAI;
  const stockProgressHeight = `${(player.stockPile.length / gameState.config.STOCK_SIZE) * 100}%`;

  const stockPileOnClick: MouseEventHandler = (e) => {
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
  };


  // @ts-expect-error setting variable in style
  return <div className="flex items-center relative gap-2" style={{"--card-rotate": "0deg"}}>
    <div className="vertical-text">Talon ({player.stockPile.length})</div>
    {player.stockPile.length > 0 ? (
      <div className="relative w-full stock-pile">
        {/* Show the top card unless it's being animated */}
        {isCardBeingAnimated(playerIndex, 'stock', player.stockPile.length - 1)
          ? (player.stockPile.length > 1 ? (
            <Card
              hint={player.stockPile.length === 2 ? 'Second card in stock' : 'Second card in stock (hidden)'}
              card={player.stockPile[player.stockPile.length - 2]}
              isRevealed={!isHiddenMultiplayerCard(player.stockPile[player.stockPile.length - 2])}
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
        className="w-1 self-end rounded-t-sm bg-primary transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{
          height: stockProgressHeight,
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

export function HandSection({
                              player,
                              playerIndex,
                              isCurrentPlayer,
                              gameState,
                              selectCard,
                              clearSelection
                            }: HandSectionProps) {
  const {isCardBeingAnimated} = useCardAnimation();
  const isHuman = !player.isAI;
  const handOverlaps = player.hand.length > 4;

  const handCardOnClick: MouseEventHandler = (e) => {
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
  };


  return <div className="flex items-center gap-2">
    <div className="vertical-text">Main</div>
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
