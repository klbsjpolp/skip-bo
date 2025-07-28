import React, { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { CardAnimationData } from '@/contexts/CardAnimationContext';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  animation: CardAnimationData;
  onAnimationComplete: (id: string) => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  animation, 
  onAnimationComplete 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start animation on next frame to ensure initial position is set
    const startTimer = requestAnimationFrame(() => {
      setIsAnimating(true);
    });

    // Complete animation after duration
    const completeTimer = setTimeout(() => {
      onAnimationComplete(animation.id);
    }, animation.duration);

    return () => {
      cancelAnimationFrame(startTimer);
      clearTimeout(completeTimer);
    };
  }, [animation.id, animation.duration, onAnimationComplete]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: isAnimating ? animation.endPosition.x : animation.startPosition.x,
    top: isAnimating ? animation.endPosition.y : animation.startPosition.y,
    zIndex: 1000, // Ensure animated cards appear above everything
    pointerEvents: 'none', // Don't interfere with user interactions
    transition: isAnimating ? `all ${animation.duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)` : 'none',
    transform: 'translate(-50%, -50%)', // Center the card on the position
  };

  return (
    <div
      className={cn(
        'animated-card',
        `animation-${animation.animationType}`
      )}
      style={style}
    >
      <Card
        card={animation.card}
        isRevealed={true}
        canBeGrabbed={false}
        className="shadow-lg"
      />
    </div>
  );
};