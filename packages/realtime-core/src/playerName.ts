export const MAX_PLAYER_NAME_LENGTH = 10;

export const getDefaultPlayerName = (seatIndex: number): string => `Joueur ${seatIndex + 1}`;

export const normalizePlayerName = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim().slice(0, MAX_PLAYER_NAME_LENGTH);

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export const resolvePlayerName = (value: string | null | undefined, seatIndex: number): string =>
  normalizePlayerName(value) ?? getDefaultPlayerName(seatIndex);
