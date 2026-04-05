import {afterEach, describe, expect, it, vi} from 'vitest';

const makeJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });

describe('online api configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('uses VITE_SKIPBO_API_URL when available', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', 'https://api.example.com/');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({roomCode: 'ABCDE', seatToken: 'seat-token'}));
    vi.stubGlobal('fetch', fetchMock);

    const {createOnlineRoom} = await import('../api.ts');

    await createOnlineRoom(30);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/rooms', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('falls back to runtime-config.json when the build env is missing', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', '');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({apiBaseUrl: 'https://runtime.example.com/'}))
      .mockResolvedValueOnce(makeJsonResponse({roomCode: 'ABCDE', seatToken: 'seat-token'}));
    vi.stubGlobal('fetch', fetchMock);

    const {createOnlineRoom} = await import('../api.ts');

    await createOnlineRoom(30);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/runtime-config.json', expect.objectContaining({
      cache: 'no-store',
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://runtime.example.com/rooms', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('returns a user-facing error when online play is not configured', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', '');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({apiBaseUrl: ''}));
    vi.stubGlobal('fetch', fetchMock);

    const {joinOnlineRoom} = await import('../api.ts');

    await expect(joinOnlineRoom('ABCDE')).rejects.toThrow('Le jeu en ligne n’est pas configuré pour cette installation.');
  });
});
