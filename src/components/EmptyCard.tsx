import {cn} from '@/lib/utils';
import {MouseEventHandler} from "react";

interface EmptyCardProps {
  onClick?: MouseEventHandler;
  canDropCard?: boolean;
}

export function EmptyCard({onClick, canDropCard = false}: EmptyCardProps) {
  return (
    <div
      className={cn(
        'card', 'opacity-50',
        canDropCard && 'hoverable-card cursor-pointer',
        !canDropCard && 'cursor-default'
      )}
      onClick={onClick}
    >
      Vide
    </div>
  );
}
