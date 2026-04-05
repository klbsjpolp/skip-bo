import type { CreateRoomRequest, CreateRoomResponse, JoinRoomResponse } from '@skipbo/multiplayer-protocol';

interface RuntimeConfig {
  apiBaseUrl?: string;
}

const ONLINE_CONFIGURATION_ERROR =
  'Le jeu en ligne n’est pas configuré pour cette installation.';

let runtimeConfigPromise: Promise<RuntimeConfig> | null = null;

const normalizeApiBaseUrl = (apiBaseUrl: string | undefined | null): string | null => {
  const normalizedValue = apiBaseUrl?.trim();
  return normalizedValue ? normalizedValue.replace(/\/$/, '') : null;
};

const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = fetch(`${import.meta.env.BASE_URL}runtime-config.json`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          return {};
        }

        return (await response.json()) as RuntimeConfig;
      })
      .catch(() => ({}));
  }

  const runtimeConfig = await runtimeConfigPromise;

  if (!normalizeApiBaseUrl(runtimeConfig.apiBaseUrl)) {
    runtimeConfigPromise = null;
  }

  return runtimeConfig;
};

const getApiBaseUrl = async (): Promise<string> => {
  const envApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_SKIPBO_API_URL);

  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  const runtimeConfig = await loadRuntimeConfig();
  const runtimeApiBaseUrl = normalizeApiBaseUrl(runtimeConfig.apiBaseUrl);

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

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
