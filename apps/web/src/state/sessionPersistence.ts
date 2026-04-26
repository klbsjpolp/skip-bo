import type { CreateRoomResponse } from '@skipbo/multiplayer-protocol';

const STORAGE_KEY = 'skipbo_online_session';
const SCHEMA_VERSION = 1;

interface PersistedEnvelope {
  version: number;
  session: CreateRoomResponse;
}

const isValidSession = (value: unknown): value is CreateRoomResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.expiresAt === 'string' &&
    typeof candidate.hostSeatIndex === 'number' &&
    typeof candidate.roomCode === 'string' &&
    typeof candidate.seatCapacity === 'number' &&
    typeof candidate.seatIndex === 'number' &&
    typeof candidate.seatToken === 'string' &&
    typeof candidate.wsUrl === 'string'
  );
};

export const saveOnlineSession = (session: CreateRoomResponse): void => {
  try {
    const envelope: PersistedEnvelope = { version: SCHEMA_VERSION, session };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch { /* storage unavailable, fail silently */ }
};

export const loadOnlineSession = (now: Date = new Date()): CreateRoomResponse | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope>;
    if (parsed.version !== SCHEMA_VERSION || !isValidSession(parsed.session)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (new Date(parsed.session.expiresAt).getTime() <= now.getTime()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.session;
  } catch {
    return null;
  }
};

export const clearOnlineSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
};
