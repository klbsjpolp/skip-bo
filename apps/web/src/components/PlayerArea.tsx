import type {Card as CardType, GameState, MoveResult, Player} from '@/types';
import {Card} from '@/components/Card';
import {cn} from '@/lib/utils';
import {EmptyCard} from "@/components/EmptyCard.tsx";
import type {MouseEventHandler} from "react";
import {Fragment} from "react";
import {useCardAnimation} from "@/contexts/useCardAnimation.ts";
import {useDrag, useIsDragSource} from '@/contexts/useDrag';
import {useDraggableCard} from '@/hooks/useDraggableCard';
import {VictoryEffects} from '@/components/VictoryEffects';
import {HAND_Y_OFFSETS} from '@/utils/cardPositions';

export interface PlayerAreaProps {
  player: Player;
  playerIndex: number;
  isCurrentPlayer: boolean;
  isWinner: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
    playCard: (buildPileIndex: number) => Promise<MoveResult>;
    discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  clearSelection: () => void;
}

export function PlayerArea({
                             player,
                             playerIndex,
                             isCurrentPlayer,
                             isWinner,
                             gameState,
                             selectCard,
                               playCard,
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
          {player.name && <h2 className="vertical-text border-l border-primary">{player.name}</h2>}
        <StockPile player={player} playerIndex={playerIndex} isCurrentPlayer={isCurrentPlayer} gameState={gameState}
                   selectCard={selectCard} playCard={playCard} discardCard={discardCard}
                   clearSelection={clearSelection}/>
        <HandSection player={player} playerIndex={playerIndex} isCurrentPlayer={isCurrentPlayer} gameState={gameState}
                     selectCard={selectCard} playCard={playCard} discardCard={discardCard}
                     clearSelection={clearSelection}/>
        {/* Grow - blank space */}
        <div className="grow"></div>
        <DiscardPiles player={player} playerIndex={playerIndex} isCurrentPlayer={isCurrentPlayer} gameState={gameState}
                      playCard={playCard} discardCard={discardCard} selectCard={selectCard}
                      clearSelection={clearSelection}/>
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
    playCard: (buildPileIndex: number) => Promise<MoveResult>,
    discardCard: (discardPileIndex: number) => Promise<MoveResult>,
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
                         playCard,
                       discardCard,
                       clearSelection
                     }: DiscardPileProps) {
  const {activeAnimations, isCardBeingAnimated} = useCardAnimation();
    const {session: dragSession} = useDrag();
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

    const canDropFromSelection =
        isHuman && isCurrentPlayer && gameState.selectedCard?.source === 'hand';
    const isDragActive = dragSession !== null;
    const canDropFromDrag = isDragActive
        && dragSession.validDiscardPiles.has(pileIndex)
        && playerIndex === gameState.currentPlayerIndex
        && isHuman;
    const canDrop = isDragActive ? canDropFromDrag : canDropFromSelection;
    const isDragOver = canDropFromDrag
        && dragSession?.hovered?.kind === 'discard'
        && dragSession.hovered.index === pileIndex;

    return <div className={cn(
        "drop-indicator discard-pile-stack relative",
        canDrop && "can-drop",
        isDragOver && "is-drag-over"
  )} data-pile-index={pileIndex}
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
    style={{height: `calc(var(--card-height) + ${(pile.length <= 1 ? 0 : pile.length - 1) * 20}px)`}}
  >
        <EmptyCard canDropCard={computedPiles.length === 0} hideLabel={computedPiles.length > 0} className="absolute inset-0"/>
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
          canBeGrabbed={isHuman && isCurrentPlayer && isTop}
          stackIndex={cardIdx}
        />;
    })}
  </div>;
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
    const source = {kind: 'discard' as const, index: cardIndex, discardPileIndex: pileIndex};
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

interface DiscardPilesProps {
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
                        clearSelection
                      }: DiscardPilesProps) {

  // @ts-expect-error setting variable in style
  return <div className="flex items-center gap-2" style={{"--card-rotate": "0deg"}}>
      <h2 className="min-w-fit vertical-text">Défausses</h2>
    <div className="discard-piles">
      {player.discardPiles.map((pile, pileIndex) => (
        <DiscardPile key={`discard-${pileIndex}`} pile={pile} pileIndex={pileIndex} playerIndex={playerIndex}
                     isCurrentPlayer={isCurrentPlayer} gameState={gameState} selectCard={selectCard}
                     playCard={playCard}
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
      <h2 className="vertical-text">Talon ({player.stockPile.length})</h2>
    {player.stockPile.length > 0 ? (
      <div className="relative w-(--card-width) stock-pile">
          {/* Placeholder slot behind the stock top card so the slot stays
            visible while the top card is animating to a build / discard
            pile. The label is hidden because there's a real card on top in
            the normal case; the empty-pile case has its own EmptyCard
            below. */}
          <EmptyCard canDropCard={false} hideLabel className="absolute inset-0"/>
        {/* Show the top card unless it's being animated */}
        {isCardBeingAnimated(playerIndex, 'stock', player.stockPile.length - 1)
          ? (player.stockPile.length > 1 ? (
            <Card
              hint={player.stockPile.length === 2 ? 'Second card in stock' : 'Second card in stock (hidden)'}
              card={player.stockPile[player.stockPile.length - 2]}
              isRevealed={!isHiddenMultiplayerCard(player.stockPile[player.stockPile.length - 2])}
              canBeGrabbed={false}
            />
            ) : null)
          : (
                isHuman && isCurrentPlayer && player.stockPile[player.stockPile.length - 1]
                    ? (
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
                    )
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
                    )
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
    const source = {kind: 'stock' as const, index: stockTopIndex};
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

interface HandSectionProps {
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
      <h2 className="vertical-text">Main</h2>
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
            <div
              className="card opacity-0 pointer-events-none"
              style={handOverlaps ? {
                left: `calc(${index} * (var(--card-width) - 10px))`,
                top: `${HAND_Y_OFFSETS[index]}px`,
                zIndex: index,
              } : undefined}
            />
          ) : (
              isHuman && isCurrentPlayer && card
                  ? (
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
                  )
                  : (
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
                  )
          )}
        </div>
      ))}
    </div>
  </div>;
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
    const source = {kind: 'hand' as const, index};
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
