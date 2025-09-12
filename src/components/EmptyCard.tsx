import {cn} from '@/lib/utils';
import {MouseEventHandler} from "react";

interface EmptyCardProps {
  onClick?: MouseEventHandler;
  canDropCard?: boolean;
  className?: string;
}

export function EmptyCard({onClick, canDropCard = false, className}: EmptyCardProps) {
  return (
    <div
      className={cn(
        'card empty-card opacity-50',
        canDropCard && 'hoverable-card cursor-pointer',
        !canDropCard && 'cursor-default',
        className
      )}
      onClick={onClick}
    >
      Vide
    </div>
  );
}