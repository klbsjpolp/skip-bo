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
  const [isStarted, setStarted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const startedTimeout = setTimeout(() => {
      setStarted(true);
    }, animation.initialDelay);

    return () => clearTimeout(startedTimeout);
  }, [animation.initialDelay]);

  useEffect(() => {
    if (isStarted) {
      // Start animation on next frame to ensure initial position is set
      const startTimer = requestAnimationFrame(() => {
        setIsAnimating(true);

        // The animated card (moving across screen) should always be visible
        // This is the card actually animating from point A to point B
        setIsRevealed(!(animation.animationType === 'draw' && animation.sourceInfo.playerIndex === 1));
      });

      console.log(`🎭 Card ${animation.card.value} animation INIT - Type: ${animation.animationType}, animated card is VISIBLE`);

      // Complete animation after duration
      const completeTimer = setTimeout(() => {
        onAnimationComplete(animation.id);
      }, animation.duration);

      return () => {
        cancelAnimationFrame(startTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isStarted, animation.id, animation.duration, animation.animationType, animation.card.value, onAnimationComplete]);

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
        `animation-${animation.animationType}`,
        isRevealed ? 'card-revealed' : 'card-hidden'
      )}
      style={style}
    >
      <Card
        card={animation.card}
        isRevealed={isRevealed}
        canBeGrabbed={false}
        className="shadow-lg"
      />
    </div>
  );
};