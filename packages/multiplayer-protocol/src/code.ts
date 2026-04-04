export const ROOM_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const ROOM_CODE_LENGTH = 5;

const CROCKFORD_ALIASES: Record<string, string> = {
  I: '1',
  L: '1',
  O: '0',
};

export const normalizeRoomCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .split('')
    .map((char) => CROCKFORD_ALIASES[char] ?? char)
    .join('')
    .slice(0, ROOM_CODE_LENGTH);

export const isValidRoomCode = (value: string): boolean => {
  const normalized = normalizeRoomCode(value);

  return normalized.length === ROOM_CODE_LENGTH && [...normalized].every((char) => ROOM_CODE_ALPHABET.includes(char));
};
