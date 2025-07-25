import {Card as CardType} from '@/types';
import {cn} from '@/lib/utils';
import {MouseEventHandler, CSSProperties} from "react";

interface CardProps {
  card: CardType | null,
  isRevealed?: boolean,
  isSelected?: boolean,
  onClick?: MouseEventHandler,
  className?: string,
  canBeGrabbed?: boolean,
  stackIndex?: number,
  overlapIndex?: number,
  displayValue?: string | number // Override the displayed value
}

export function Card({
                       card,
                       isRevealed = true,
                       isSelected = false,
                       onClick,
                       className,
                       canBeGrabbed = false,
                       stackIndex = undefined,
                       overlapIndex = undefined,
                       displayValue: overriddenDisplayValue
                     }: CardProps) {
  const displayValue = () => {
    if (!isRevealed) return '?';
    if (!card) return ''; // Handle null or undefined card
    if (card.isSkipBo) return 'SB';
    if (card.value === undefined) throw Error('Error')
    return card.value.toString();
  };
  
  const cardValue = overriddenDisplayValue !== undefined ? overriddenDisplayValue : displayValue();
  
  // Determine color class based on card value
  const colourClass = 
    !card || !isRevealed || card.isSkipBo ? '' :
    card.value! <= 4  ? 'card-range-1' :
    card.value! <= 8  ? 'card-range-2' :
                        'card-range-3';
  
  let style: CSSProperties | undefined = undefined;
  if (stackIndex !== undefined) {
    style = {
      top: `${stackIndex * 20}px`,
      zIndex: stackIndex,
    }
  } else if (overlapIndex !== undefined) {
    // Calculate rotation angle for fanned hand effect
    const handSize = 5; // Default hand size
    const angle = (overlapIndex - Math.floor(handSize/2)) * 4; // −8°..+8°
    
    style = {
      left: `${overlapIndex * 60}px`,
      zIndex: overlapIndex,
      transform: `rotate(${angle}deg)`
    }
  }
  return (card ?
    <div
      className={cn(
        'card',
        !isRevealed && 'back',
        card && card.isSkipBo && isRevealed && 'skip-bo',
        colourClass,
        isSelected && 'selected',
        onClick && canBeGrabbed && 'hover:shadow-lg hover:transform hover:scale-105 cursor-pointer',
        onClick && !canBeGrabbed && 'cursor-default',
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
}
