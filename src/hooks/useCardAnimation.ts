import { useCallback } from 'react';
import { Card } from '@/types';

export interface CardAnimationData {
  id: string;
  card: Card;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  animationType: 'play' | 'discard' | 'draw';
  duration: number;
}

export interface AnimationContextType {
  activeAnimations: CardAnimationData[];
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => void;
  removeAnimation: (id: string) => void;
}

// This will be implemented with React Context
export const useCardAnimation = () => {
  // TODO: Implement context usage
  const startAnimation = useCallback((animationData: Omit<CardAnimationData, 'id'>) => {
    // Generate unique ID and start animation
    const id = `animation-${Date.now()}-${Math.random()}`;
    console.log('Starting animation:', { id, ...animationData });
  }, []);

  const removeAnimation = useCallback((id: string) => {
    console.log('Removing animation:', id);
  }, []);

  return {
    activeAnimations: [],
    startAnimation,
    removeAnimation,
  };
};