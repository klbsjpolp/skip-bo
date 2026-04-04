import type { CreateRoomRequest, CreateRoomResponse, JoinRoomResponse } from '@skipbo/multiplayer-protocol';

const getApiBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_SKIPBO_API_URL;

  if (!apiBaseUrl) {
    throw new Error('VITE_SKIPBO_API_URL n’est pas configurée.');
  }

  return apiBaseUrl.replace(/\/$/, '');
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
  const response = await fetch(`${getApiBaseUrl()}/rooms`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<CreateRoomResponse>(response);
};

export const joinOnlineRoom = async (roomCode: string): Promise<JoinRoomResponse> => {
  const response = await fetch(`${getApiBaseUrl()}/rooms/join`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ roomCode }),
  });

  return parseJsonResponse<JoinRoomResponse>(response);
};
