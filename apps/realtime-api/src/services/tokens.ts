import { createHash, randomBytes } from 'node:crypto';

export const createSeatToken = (): string => randomBytes(16).toString('hex');

export const hashSeatToken = (seatToken: string): string =>
  createHash('sha256').update(seatToken).digest('hex');
