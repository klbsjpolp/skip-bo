import { createPortal } from 'react-dom';
import { Card } from '@/components/Card';
import { useDrag } from '@/contexts/useDrag';

export function DragGhost() {
  const { session } = useDrag();
  if (!session) return null;

  const { card, pointer } = session;

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="drag-ghost"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`,
        pointerEvents: 'none',
        zIndex: 1100,
        willChange: 'transform',
      }}
    >
      <Card card={card} isRevealed canBeGrabbed={false} className="card-drag-ghost" />
    </div>,
    document.body,
  );
}
