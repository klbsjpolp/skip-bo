import {createContext, useContext} from "react";
import {AnimationContextType} from "@/contexts/CardAnimationContext.tsx";

export const CardAnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useCardAnimation = (): AnimationContextType => {
  const context = useContext(CardAnimationContext);
  if (context === undefined) {
    throw new Error('useCardAnimation must be used within a CardAnimationProvider');
  }
  return context;
};