import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  getStoredSoundEnabled,
  getStoredSoundVolume,
  storeSoundEnabled,
  storeSoundVolume,
} from '@/state/lobbyPreferences';
import { soundController } from './controller';
import type { SoundThemeId } from './types';
import { SoundContext, type SoundContextValue } from './useSound';

export const SoundProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { resolvedTheme, theme } = useTheme();
  const [enabled, setEnabledState] = useState<boolean>(() => getStoredSoundEnabled());
  const [volume, setVolumeState] = useState<number>(() => getStoredSoundVolume());

  // Push initial prefs into the controller once on mount.
  useEffect(() => {
    soundController.setVolume(volume);
    soundController.setEnabled(enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the sound theme in sync with the active visual theme (auto-follow).
  useEffect(() => {
    const active = (resolvedTheme ?? theme) as SoundThemeId | undefined;
    soundController.setThemeId(active ?? 'base');
  }, [resolvedTheme, theme]);

  // Autoplay unlock: resume the AudioContext on the first user gesture.
  useEffect(() => {
    const unlock = () => soundController.unlock();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    storeSoundEnabled(next);
    soundController.setEnabled(next);
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    storeSoundVolume(clamped);
    soundController.setVolume(clamped);
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({ enabled, setEnabled, volume, setVolume }),
    [enabled, setEnabled, volume, setVolume],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};
