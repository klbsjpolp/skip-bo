import {
  normalizePlayerName,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type JoinRoomResponse,
} from '@skipbo/multiplayer-protocol';
import {clearRuntimeConfigCache, fetchRuntimeConfig} from '@/lib/runtimeConfig';

const ONLINE_CONFIGURATION_ERROR =
  'Le jeu en ligne n’est pas configuré pour cette installation.';

const normalizeApiBaseUrl = (apiBaseUrl: string | undefined | null): string | null => {
  const normalizedValue = apiBaseUrl?.trim();
  return normalizedValue ? normalizedValue.replace(/\/$/, '') : null;
};

const getApiBaseUrl = async (): Promise<string> => {
  const envApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_SKIPBO_API_URL);

  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  const runtimeConfig = await fetchRuntimeConfig();
  const runtimeApiBaseUrl = normalizeApiBaseUrl(runtimeConfig.apiBaseUrl);

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  clearRuntimeConfigCache();

  throw new Error(ONLINE_CONFIGURATION_ERROR);
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload: unknown = await response.json().catch(() => ({} as unknown));

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'La requête a échoué.';
    throw new Error(message);
  }

  return payload as T;
};

export const createOnlineRoom = async (
  stockSize: number,
  playerName?: string,
): Promise<CreateRoomResponse> => {
  const request: CreateRoomRequest = {
    playerName: normalizePlayerName(playerName),
    stockSize,
  };
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/rooms`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<CreateRoomResponse>(response);
};

export const joinOnlineRoom = async (roomCode: string, playerName?: string): Promise<JoinRoomResponse> => {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/rooms/join`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      playerName: normalizePlayerName(playerName),
      roomCode,
    }),
  });

  return parseJsonResponse<JoinRoomResponse>(response);
};
