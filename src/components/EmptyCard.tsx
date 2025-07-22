import {cn} from '@/lib/utils';

interface EmptyCardProps {
  onClick?: () => void;
  canDropCard?: boolean;
}

export function EmptyCard({onClick, canDropCard = false}: EmptyCardProps) {
  return (
    <div
      className={cn(
        'card', 'opacity-50',
        onClick && canDropCard && 'hover:shadow-lg hover:transform hover:scale-105 cursor-pointer',
        onClick && !canDropCard && 'cursor-default'
      )}
      onClick={onClick}
    >
      Vide
    </div>
  );
}
