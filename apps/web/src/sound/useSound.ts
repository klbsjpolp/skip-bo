import { createContext, useContext } from 'react';

export interface SoundContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export const SoundContext = createContext<SoundContextValue | undefined>(undefined);

export const useSound = (): SoundContextValue => {
  const ctx = useContext(SoundContext);
  if (ctx === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return ctx;
};
