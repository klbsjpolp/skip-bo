import type {FC, ReactNode} from 'react';
import { useCallback, useRef, useState} from 'react';
import { flushSync } from 'react-dom';
import type {Card} from '@/types';
import {CardAnimationContext} from "./useCardAnimation";

export interface CardAnimationData {
  id: string;
  card: Card;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  animationType: 'play' | 'discard' | 'draw' | 'complete';
  sourceRevealed: boolean; // Whether the card starts face-up or face-down
  targetRevealed: boolean; // Whether the card ends face-up or face-down
  initialDelay: number;
  duration: number;
  // Optional rotation angles (degrees) for smoother, accurate animation
  startAngleDeg?: number;
  endAngleDeg?: number;
  // True when the authoritative UI state already contains the animated card at the target.
  targetSettledInState?: boolean;
  // True once AnimatedCard has started the WAAPI travel (initialDelay elapsed).
  hasStarted?: boolean;
  // Source information to identify which card should be hidden
  sourceInfo: {
    playerIndex: number;
    source: 'hand' | 'stock' | 'discard' | 'deck' | 'build';
    index: number;
    discardPileIndex?: number;
  };
  targetInfo?: {
    playerIndex: number;
    source: 'hand' | 'stock' | 'discard' | 'deck' | 'build';
    index: number;
    discardPileIndex?: number;
  };
}

export interface AnimationContextType {
  activeAnimations: CardAnimationData[];
  startAnimation: (animationData: Omit<CardAnimationData, 'id'>) => string;
  removeAnimation: (id:string) => void;
  markAnimationStarted: (id: string) => void;
  isCardBeingAnimated: (
    playerIndex: number,
    source: 'hand' | 'stock' | 'discard' | 'deck' | 'build',
    index: number,
    discardPileIndex?: number,
  ) => boolean;
  waitForAnimations: () => Promise<void>;
}

interface CardAnimationProviderProps {
  children: ReactNode;
}

export const CardAnimationProvider: FC<CardAnimationProviderProps> = ({ children }) => {
  const [activeAnimations, setActiveAnimations] = useState<CardAnimationData[]>([]);
  const activeAnimationIds = useRef(new Set<string>());
  const animationCompletionResolvers = useRef<(() => void)[]>([]);

  const resolveAnimationWaiters = useCallback(() => {
    if (activeAnimationIds.current.size === 0) {
      animationCompletionResolvers.current.forEach(resolve => resolve());
      animationCompletionResolvers.current = [];
    }
  }, []);

  const removeAnimation = useCallback((id: string) => {
    if (!activeAnimationIds.current.delete(id)) {
      return;
    }

    flushSync(() => {
      setActiveAnimations(prev => prev.filter(anim => anim.id !== id));
    });

    resolveAnimationWaiters();
  }, [resolveAnimationWaiters]);

  const startAnimation = useCallback((animationData: Omit<CardAnimationData, 'id'>) => {
    const id = `animation-${Date.now()}-${Math.random()}`;
    const newAnimation: CardAnimationData = {
      id,
      ...animationData,
    };

    activeAnimationIds.current.add(id);

    flushSync(() => {
      setActiveAnimations(prev => [...prev, newAnimation]);
    });

    return id;
  }, []);

  const waitForAnimations = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (activeAnimationIds.current.size === 0) {
        resolve();
      } else {
        animationCompletionResolvers.current.push(resolve);
      }
    });
  }, []);

  const markAnimationStarted = useCallback((id: string) => {
    setActiveAnimations(prev => {
      const target = prev.find(a => a.id === id);
      if (!target || target.hasStarted) return prev; // already marked — return same ref, no re-render
      return prev.map(anim => anim.id === id ? { ...anim, hasStarted: true } : anim);
    });
  }, []);

  const isCardBeingAnimated = useCallback((
    playerIndex: number, 
    source: 'hand' | 'stock' | 'discard' | 'deck' | 'build',
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
    markAnimationStarted,
    isCardBeingAnimated,
    waitForAnimations,
  };

  return (
    <CardAnimationContext.Provider value={value}>
      {children}
    </CardAnimationContext.Provider>
  );
};
