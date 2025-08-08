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
    const startedTimeout = setTimeout(() => {
      // Start animation on next frame to ensure initial position is set
      const startTimer = requestAnimationFrame(() => {
        setIsAnimating(true);
      });

      console.log(`🎭 Card ${animation.card.value} animation INIT - Type: ${animation.animationType}, animated card is VISIBLE`);

      return () => {
        cancelAnimationFrame(startTimer);
      };
    }, animation.initialDelay);

    return () => {
      clearTimeout(startedTimeout);
    }
  }, [animation.id, animation.duration, animation.animationType, animation.card.value, onAnimationComplete, animation.sourceInfo.playerIndex, animation.initialDelay]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: isAnimating ? animation.endPosition.x : animation.startPosition.x,
    top: isAnimating ? animation.endPosition.y : animation.startPosition.y,
    zIndex: 1000, // Ensure animated cards appear above everything
    pointerEvents: 'none', // Don't interfere with user interactions
    transition: isAnimating ? `all ${animation.duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)` : 'none',
    transform: 'translate(-50%, -50%)', // Center the card on the position
  };

  // Determine if the card should be revealed during animation
  // AI cards (playerIndex 1) should remain face-down during draw animations
  const shouldRevealCard = () => {
    // For draw animations, only reveal if it's the human player (playerIndex 0)
    if (animation.animationType === 'draw') {
      return animation.sourceInfo.playerIndex === 0; // Human player
    }
    // For play and discard animations, always reveal the card
    return true;
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
        hint="AnimatedCard"
        card={animation.card}
        isRevealed={shouldRevealCard()}
        canBeGrabbed={false}
        className="shadow-lg"
      />
    </div>
  );
};