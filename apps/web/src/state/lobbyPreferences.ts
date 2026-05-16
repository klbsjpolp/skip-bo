const PLAYER_NAME_KEY = 'skipbo_player_name';

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
