import { Card as CardType } from '@/types';
import { cn } from '@/lib/utils';
import {MouseEventHandler} from "react";

interface CardProps {
  card: CardType;
  isRevealed?: boolean;
  isSelected?: boolean;
  onClick?: MouseEventHandler;
  className?: string;
  canBeGrabbed?: boolean;
}

export function Card({ card, isRevealed = true, isSelected = false, onClick, className, canBeGrabbed = false }: CardProps) {
  const displayValue = () => {
    if (!isRevealed) return '?';
    if (card.isSkipBo) return 'SB';
    if (card.value === undefined) throw Error('Error')
    return card.value.toString();
  };

  return (
    <div
      className={cn(
        'card',
        !isRevealed && 'back',
        card && card.isSkipBo && isRevealed && 'skip-bo',
        isSelected && 'selected',
        onClick && canBeGrabbed && 'hover:shadow-lg hover:transform hover:scale-105 cursor-pointer',
        onClick && !canBeGrabbed && 'cursor-default',
        className
      )}
      onClick={onClick}
    >
      {displayValue()}
    </div>
  );
}
