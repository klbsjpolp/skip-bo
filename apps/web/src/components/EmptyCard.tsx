import { memo, type MouseEventHandler } from 'react';

import { cn } from '@/lib/utils';

interface EmptyCardProps {
  onClick?: MouseEventHandler;
  canDropCard?: boolean;
  className?: string;
  /** Hide the "Vide" text — useful when the placeholder sits behind another
   *  card (e.g. the deck) and is only visible during a draw animation. */
  hideLabel?: boolean;
}

function EmptyCardComponent({ onClick, canDropCard = false, className, hideLabel = false }: EmptyCardProps) {
  return (
    <div
      className={cn(
        'card empty-card',
        canDropCard && 'hoverable-card cursor-pointer',
        !canDropCard && 'cursor-default',
        className,
      )}
      onClick={onClick}
    >
      {hideLabel ? null : 'Vide'}
    </div>
  );
}

export const EmptyCard = memo(EmptyCardComponent);
