import {ReactNode, useCallback, useState} from 'react';
import {Card} from '@/types';
import {CardAnimationContext} from "./useCardAnimation";

export interface CardAnimationData {
  id: string;
  card: Card;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  animationType: 'play' | 'discard' | 'draw';
  initialDelay: number;
  duration: number;
  // Source information to identify which card should be hidden
  sourceInfo: {
    playerIndex: number;
    source: 'hand' | 'stock' | 'discard' | 'deck';
    index: number;
    discardPileIndex?: number;
  };
}

export interface AnimationContextType {
  activeAnimations: CardAnimationData[];
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string;
  removeAnimation: (id: string) => void;
  isCardBeingAnimated: (playerIndex: number, source: 'hand' | 'stock' | 'discard' | 'deck', index: number, discardPileIndex?: number) => boolean;
}

interface CardAnimationProviderProps {
  children: ReactNode;
}

export const CardAnimationProvider: React.FC<CardAnimationProviderProps> = ({ children }) => {
  const [activeAnimations, setActiveAnimations] = useState<CardAnimationData[]>([]);

  const removeAnimation = useCallback((id: string) => {
    setActiveAnimations(prev => prev.filter(anim => anim.id !== id));
  }, []);

  const startAnimation = useCallback((animationData: Omit<CardAnimationData, 'id'>) => {
    const id = `animation-${Date.now()}-${Math.random()}`;
    const newAnimation: CardAnimationData = {
      id,
      ...animationData,
    };

    setActiveAnimations(prev => [...prev, newAnimation]);

    // Auto-remove animation after duration
    setTimeout(() => {
      removeAnimation(id);
    }, animationData.duration + animationData.initialDelay);

    return id; // Return the animation ID so it can be manually removed
  }, [removeAnimation]);

  const isCardBeingAnimated = useCallback((
    playerIndex: number, 
    source: 'hand' | 'stock' | 'discard' | 'deck', 
    index: number, 
    discardPileIndex?: number
  ) => {
    return activeAnimations.some(animation => {
      const sourceInfo = animation.sourceInfo;
      return sourceInfo.playerIndex === playerIndex &&
        sourceInfo.source === source &&
        sourceInfo.index === index &&
        sourceInfo.discardPileIndex === discardPileIndex;
    });
  }, [activeAnimations]);

  const value: AnimationContextType = {
    activeAnimations,
    startAnimation,
    removeAnimation,
    isCardBeingAnimated,
  };

  return (
    <CardAnimationContext.Provider value={value}>
      {children}
    </CardAnimationContext.Provider>
  );
};

