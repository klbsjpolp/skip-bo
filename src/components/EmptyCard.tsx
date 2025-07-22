import {cn} from '@/lib/utils';

interface EmptyCardProps {
  onClick?: () => void
}

export function EmptyCard({onClick}: EmptyCardProps) {
  return (
    <div
      className={cn(
        'card', 'opacity-50'
      )}
      onClick={onClick}
    >
      Vide
    </div>
  );
}
