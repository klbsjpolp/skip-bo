import {useCallback, useState} from 'react';

export const AI_COACH_ENABLED_STORAGE_KEY = 'skipbo_ai_coach_enabled';

const DEFAULT_COACH_ENABLED = true;

const getStorage = (): Storage | null => {
  try {
    return typeof globalThis === 'object' &&
      'localStorage' in globalThis &&
      globalThis.localStorage
        ? globalThis.localStorage
        : null;
  } catch {
    return null;
  }
};

export const getStoredCoachEnabled = (): boolean => {
  const storage = getStorage();

  if (!storage) {
    return DEFAULT_COACH_ENABLED;
  }

  try {
    return storage.getItem(AI_COACH_ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return DEFAULT_COACH_ENABLED;
  }
};

export function useStoredCoachEnabled(): [boolean, (enabled: boolean) => void] {
  const [isCoachEnabled, setIsCoachEnabledState] = useState(() => getStoredCoachEnabled());

  const setIsCoachEnabled = useCallback((enabled: boolean) => {
    setIsCoachEnabledState(enabled);

    const storage = getStorage();

    try {
      if (storage) {
        storage.setItem(AI_COACH_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
      }
    } catch { /* ignore */ }
  }, []);

  return [isCoachEnabled, setIsCoachEnabled];
}
