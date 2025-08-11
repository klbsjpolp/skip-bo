import React from 'react';
import { AnimatedCard } from '@/components/AnimatedCard';
import {useCardAnimation} from "@/contexts/useCardAnimation.ts";

/**
 * CardAnimationLayer renders all active card animations as an overlay
 * This component should be placed at the root level of the app to ensure
 * animated cards can move freely across the entire screen
 */
export const CardAnimationLayer: React.FC = () => {
  const { activeAnimations } = useCardAnimation();

  if (activeAnimations.length === 0) {
    return null;
  }

  return (
    <div className="card-animation-layer">
      {activeAnimations.map((animation) => (
        <AnimatedCard
          key={animation.id}
          animation={animation}
        />
      ))}
    </div>
  );
};