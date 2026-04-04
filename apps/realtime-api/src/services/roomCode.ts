import { randomInt } from 'node:crypto';

import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@skipbo/multiplayer-protocol';

export const createRoomCode = (): string =>
  Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join('');
