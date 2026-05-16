import { cn } from '@/lib/utils';
import type { MouseEventHandler } from 'react';

interface EmptyCardProps {
  onClick?: MouseEventHandler;
  canDropCard?: boolean;
  className?: string;
  /** Hide the "Vide" text — useful when the placeholder sits behind another
   *  card (e.g. the deck) and is only visible during a draw animation. */
  hideLabel?: boolean;
}

export function EmptyCard({ onClick, canDropCard = false, className, hideLabel = false }: EmptyCardProps) {
  return (
    <div
      className={cn(
        'card empty-card opacity-50',
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
