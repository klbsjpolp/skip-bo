export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ';
export const ROOM_CODE_LENGTH = 3;

export const normalizeRoomCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .slice(0, ROOM_CODE_LENGTH);

export const isValidRoomCode = (value: string): boolean => {
  const normalized = normalizeRoomCode(value);

  return normalized.length === ROOM_CODE_LENGTH && [...normalized].every((char) => ROOM_CODE_ALPHABET.includes(char));
};
