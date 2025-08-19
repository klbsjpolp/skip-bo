import {Card as CardType} from '@/types';
import {cn} from '@/lib/utils';
import React, {MouseEventHandler, CSSProperties, memo} from "react";

interface CardProps {
  card: CardType | null,
  isRevealed?: boolean,
  isSelected?: boolean,
  onClick?: MouseEventHandler,
  className?: string,
  canBeGrabbed?: boolean,
  stackIndex?: number,
  overlapIndex?: number,
  displayValue?: string | number,
  hint?: string
}

const CardComponent: React.FC<CardProps> = ({
                                              card,
                                              isRevealed = true,
                                              isSelected = false,
                                              onClick,
                                              className,
                                              canBeGrabbed = false,
                                              stackIndex = undefined,
                                              overlapIndex = undefined,
                                              displayValue: overriddenDisplayValue
                                            }) => {
  const displayValue = () => {
    if (!isRevealed) return '';
    if (!card) return ''; // Handle null or undefined card
    if (card.isSkipBo) return 'Skip-Bo';
    if (card.value === undefined) throw Error('Error')
    return card.value.toString();
  };

  const cardValue = overriddenDisplayValue !== undefined ? overriddenDisplayValue : displayValue();

  // Determine color class based on card value
  const colourClass =
    !card || !isRevealed ? '' :
      (card.isSkipBo && !overriddenDisplayValue) ? 'skipbo-text' :
        (Number(cardValue) <= 4) ? 'card-range-1' :
          (Number(cardValue) <= 8) ? 'card-range-2' :
            (Number(cardValue) <= 12) ? 'card-range-3' : '';

  let style: CSSProperties | undefined = undefined;
  if (stackIndex !== undefined) {
    style = {
      top: `${stackIndex * 20}px`,
      zIndex: stackIndex,
    }
  } else if (overlapIndex !== undefined) {
    // Calculate rotation angle for fanned hand effect
    const handSize = 5; // Default hand size
    const angle = (overlapIndex - Math.floor(handSize / 2)) * 4; // −8°..+8°
    const offset = [4, -3, -5, -3, 4][overlapIndex]

    style = {
      left: `calc(${overlapIndex} * (var(--card-width) - 10px))`,
      top: `${offset}px`,
      zIndex: overlapIndex,
      '--card-rotate': `${angle}deg`
    } as CSSProperties;
  }
  //console.log('Card', 'hint', hint, 'cardValue', cardValue, 'card', card?.isSkipBo ? 'SB' : card?.value, 'isRevealed', isRevealed, 'isSelected', isSelected, 'colourClass', colourClass, 'overlapIndex', overlapIndex, 'stackIndex', stackIndex)
  return (card ?
      <div
        className={cn(
          'card', 'text-shadow-foreground', 'text-shadow-sm',
          !isRevealed && 'back',
          card && card.isSkipBo && isRevealed && 'skip-bo',
          colourClass,
          isSelected && 'selected',
          canBeGrabbed && 'hoverable-card cursor-pointer',
          !canBeGrabbed && 'cursor-default',
          className
        )}
        onClick={onClick}
        style={style}
      >
        <span className="card-corner-number">{cardValue}</span>
        <span>{cardValue}</span>
      </div>
      : <></>
  );
};

export const Card = memo(CardComponent);
