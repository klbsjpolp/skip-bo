import {
  type AiCoachResponse,
  type AiLocalCoachRequest,
  type AiLocalCoachResponse,
  type AiLocalPostGameSummaryRequest,
  type AiLocalPostGameSummaryResponse,
  type AiPostGameSummaryResponse,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type RoomSession,
} from '@skipbo/multiplayer-protocol';
import {clearRuntimeConfigCache, fetchRuntimeConfig} from '@/lib/runtimeConfig';

const ONLINE_CONFIGURATION_ERROR =
  'Le jeu en ligne n’est pas configuré pour cette installation.';

const normalizeApiBaseUrl = (apiBaseUrl: string | undefined | null): string | null => {
  const normalizedValue = apiBaseUrl?.trim();
  return normalizedValue ? normalizedValue.replace(/\/$/, '') : null;
};

const getOptionalApiBaseUrl = async (): Promise<string | null> => {
  const envApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_SKIPBO_API_URL);

  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  const runtimeConfig = await fetchRuntimeConfig();
  const runtimeApiBaseUrl = normalizeApiBaseUrl(runtimeConfig.apiBaseUrl);

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  return null;
};

const getApiBaseUrl = async (): Promise<string> => {
  const apiBaseUrl = await getOptionalApiBaseUrl();

  if (apiBaseUrl) {
    return apiBaseUrl;
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

export const createOnlineRoom = async (stockSize: number): Promise<CreateRoomResponse> => {
  const request: CreateRoomRequest = { stockSize };
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

export const joinOnlineRoom = async (roomCode: string): Promise<JoinRoomResponse> => {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/rooms/join`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ roomCode }),
  });

  return parseJsonResponse<JoinRoomResponse>(response);
};

export const requestAiCoach = async (
  session: Pick<RoomSession, 'roomCode' | 'seatIndex' | 'seatToken'>,
  roomVersion?: number,
  options?: {signal?: AbortSignal},
): Promise<AiCoachResponse> => {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/ai/coach`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    signal: options?.signal,
    body: JSON.stringify({
      roomCode: session.roomCode,
      roomVersion,
      seatIndex: session.seatIndex,
      seatToken: session.seatToken,
    }),
  });

  return parseJsonResponse<AiCoachResponse>(response);
};

export const requestAiPostGameSummary = async (
  session: Pick<RoomSession, 'roomCode' | 'seatIndex' | 'seatToken'>,
  options?: {signal?: AbortSignal},
): Promise<AiPostGameSummaryResponse> => {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/ai/post-game-summary`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    signal: options?.signal,
    body: JSON.stringify({
      roomCode: session.roomCode,
      seatIndex: session.seatIndex,
      seatToken: session.seatToken,
    }),
  });

  return parseJsonResponse<AiPostGameSummaryResponse>(response);
};

export const requestLocalAiCoach = async (
  request: AiLocalCoachRequest,
  options?: {signal?: AbortSignal},
): Promise<AiLocalCoachResponse> => {
  const apiBaseUrl = await getOptionalApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error(ONLINE_CONFIGURATION_ERROR);
  }

  const response = await fetch(`${apiBaseUrl}/ai/local/coach`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    signal: options?.signal,
    body: JSON.stringify(request),
  });

  return parseJsonResponse<AiLocalCoachResponse>(response);
};

export const requestLocalAiPostGameSummary = async (
  request: AiLocalPostGameSummaryRequest,
  options?: {signal?: AbortSignal},
): Promise<AiLocalPostGameSummaryResponse> => {
  const apiBaseUrl = await getOptionalApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error(ONLINE_CONFIGURATION_ERROR);
  }

  const response = await fetch(`${apiBaseUrl}/ai/local/post-game-summary`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    signal: options?.signal,
    body: JSON.stringify(request),
  });

  return parseJsonResponse<AiLocalPostGameSummaryResponse>(response);
};
