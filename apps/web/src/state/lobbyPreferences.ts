const PLAYER_NAME_KEY = 'skipbo_player_name';
const SOUND_ENABLED_KEY = 'skipbo_sound_enabled';
const SOUND_VOLUME_KEY = 'skipbo_sound_volume';

// Audio is opt-in: a PWA should not play sound on first load. See
// docs/architecture/sound-design.md.
const SOUND_ENABLED_DEFAULT = false;
const SOUND_VOLUME_DEFAULT = 0.8;

export const getStoredPlayerName = (): string => {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
};

export const storePlayerName = (name: string): void => {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    /* ignore */
  }
};

export const getStoredSoundEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(SOUND_ENABLED_KEY);
    return raw === null ? SOUND_ENABLED_DEFAULT : raw === 'true';
  } catch {
    return SOUND_ENABLED_DEFAULT;
  }
};

export const storeSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {
    /* ignore */
  }
};

export const getStoredSoundVolume = (): number => {
  try {
    const raw = localStorage.getItem(SOUND_VOLUME_KEY);
    if (raw === null) return SOUND_VOLUME_DEFAULT;
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed)) return SOUND_VOLUME_DEFAULT;
    return Math.max(0, Math.min(1, parsed));
  } catch {
    return SOUND_VOLUME_DEFAULT;
  }
};

export const storeSoundVolume = (volume: number): void => {
  try {
    localStorage.setItem(SOUND_VOLUME_KEY, String(Math.max(0, Math.min(1, volume))));
  } catch {
    /* ignore */
  }
};
