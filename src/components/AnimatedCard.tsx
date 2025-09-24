import React, { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { CardAnimationData } from '@/contexts/CardAnimationContext';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  animation: CardAnimationData;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  animation
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(animation.sourceRevealed);
  const needsFlip = animation.sourceRevealed !== animation.targetRevealed;

  useEffect(() => {
    let startTimer = 0 as unknown as number;
    let flipTimer: NodeJS.Timeout | undefined;

    const startedTimeout = setTimeout(() => {
      // Start animation on next frame to ensure initial position is set
      startTimer = requestAnimationFrame(() => {
        setIsAnimating(true);
      });

      // Schedule reveal flip at mid-duration when applicable
      if (needsFlip && animation.duration > 0) {
        const half = Math.max(1, Math.floor(animation.duration * 0.35)); //For cubic-bezier(0.4, 0.0, 0.2, 1), the midpoint is ~35%
        flipTimer = setTimeout(() => setIsRevealed(animation.targetRevealed), half);
      }

      console.log(`🎭 Card ${animation.card.value} animation INIT - Type: ${animation.animationType}, flip=${needsFlip}`);
    }, animation.initialDelay);

    return () => {
      if (startTimer) cancelAnimationFrame(startTimer);
      clearTimeout(startedTimeout);
      if (flipTimer) clearTimeout(flipTimer);
    };
  }, [animation.id, animation.duration, animation.animationType, animation.card.value, animation.initialDelay, needsFlip, animation.targetRevealed]);

  const currentAngleZ = isAnimating ? (animation.endAngleDeg ?? 0) : (animation.startAngleDeg ?? 0);

  // Apply rotateY for flip during animation
  const currentAngleY = needsFlip ? (isAnimating ? 0 : 180) : 0;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: isAnimating ? animation.endPosition.x : animation.startPosition.x,
    top: isAnimating ? animation.endPosition.y : animation.startPosition.y,
    zIndex: 1000 - animation.sourceInfo.index, // Ensure animated cards appear above everything
    pointerEvents: 'none', // Don't interfere with user interactions
    transition: isAnimating ? `all ${animation.duration}ms cubic-bezier(0.4, 0.0, 0.2, 1)` : 'none',
    transform: `translate(-50%, -50%) rotateZ(${currentAngleZ}deg) rotateY(${currentAngleY}deg)`,
    transformStyle: 'preserve-3d',
    willChange: 'transform left top',
  };

  const faceCommon: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transformStyle: 'preserve-3d',
  };

  return (
    <div
      className={cn(
        'animated-card',
        `animation-${animation.animationType}`
      )}
      style={style}
    >
      {needsFlip ? (
        <div style={{ position: 'relative', width: 'var(--card-width)', height: 'var(--card-height)' }}>
          {/* Front face (target state) */}
          <div style={{ ...faceCommon, visibility: isRevealed ? 'visible' : 'hidden' }}>
            <Card
              hint="AnimatedCardFront"
              card={animation.card}
              isRevealed={animation.targetRevealed}
              canBeGrabbed={false}
            />
          </div>
          {/* Back face (source state) */}
          <div style={{ ...faceCommon, transform: 'rotateY(180deg)', visibility: !isRevealed ? 'visible' : 'hidden' }}>
            <Card
              hint="AnimatedCardBack"
              card={animation.card}
              isRevealed={animation.sourceRevealed}
              canBeGrabbed={false}
            />
          </div>
        </div>
      ) : (
        <Card
          hint="AnimatedCard"
          card={animation.card}
          isRevealed={isRevealed}
          canBeGrabbed={false}
        />
      )}
    </div>
  );
};