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

  // Keep the AudioContext unlocked. Two cases to cover:
  //   1. First user gesture (autoplay policy) unlocks a freshly-created context.
  //   2. Safari (and some mobile browsers) SUSPEND the context when the tab is
  //      backgrounded and do NOT auto-resume on return — so every sound is
  //      silently dropped until something resumes it again.
  // The listeners are intentionally persistent (not `once`): resume() is a cheap
  // no-op when the context is already running, so re-firing on every gesture and
  // whenever the tab becomes visible again keeps audio alive across tab switches.
  useEffect(() => {
    const unlock = () => soundController.unlock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        soundController.unlock();
      }
    };
    const opts = { passive: true } as const;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', unlock);
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
