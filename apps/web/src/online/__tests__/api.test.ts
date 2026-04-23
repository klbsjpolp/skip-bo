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
      body: JSON.stringify({ stockSize: 30 }),
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
      body: JSON.stringify({ stockSize: 30 }),
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

  it('sends room code in join requests', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', 'https://api.example.com');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({ roomCode: 'ABCDE', seatToken: 'seat-token' }));
    vi.stubGlobal('fetch', fetchMock);

    const { joinOnlineRoom } = await import('../api.ts');

    await joinOnlineRoom('ABCDE');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/rooms/join', expect.objectContaining({
      body: JSON.stringify({ roomCode: 'ABCDE' }),
      method: 'POST',
    }));
  });

  it('requests AI coach insights with the authenticated room session', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', 'https://api.example.com');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({
        displayText: 'Coach: joue le 3 de ton talon vers la pile 2.',
        fallbackUsed: true,
        recommendation: { action: 'play', reasonCodes: ['play-stock'], score: 1003 },
        roomVersion: 7,
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { requestAiCoach } = await import('../api.ts');
    const controller = new AbortController();

    await requestAiCoach({
      roomCode: 'ABCDE',
      seatIndex: 1,
      seatToken: 'seat-token',
    }, 7, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/ai/coach', expect.objectContaining({
      body: JSON.stringify({
        roomCode: 'ABCDE',
        roomVersion: 7,
        seatIndex: 1,
        seatToken: 'seat-token',
      }),
      method: 'POST',
      signal: controller.signal,
    }));
  });

  it('requests AI post-game summaries with the authenticated room session', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', 'https://api.example.com');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({
        displayText: 'Résumé: victoire en 12 coups - point fort: talon.',
        fallbackUsed: true,
        roomVersion: 11,
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { requestAiPostGameSummary } = await import('../api.ts');
    const controller = new AbortController();

    await requestAiPostGameSummary({
      roomCode: 'ABCDE',
      seatIndex: 0,
      seatToken: 'seat-token',
    }, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/ai/post-game-summary', expect.objectContaining({
      body: JSON.stringify({
        roomCode: 'ABCDE',
        seatIndex: 0,
        seatToken: 'seat-token',
      }),
      method: 'POST',
      signal: controller.signal,
    }));
  });

  it('requests local AI coach insights without room credentials', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', 'https://api.example.com');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({
        displayText: 'Coach: texte amélioré.',
        fallbackUsed: false,
        localVersion: 2,
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { requestLocalAiCoach } = await import('../api.ts');
    const controller = new AbortController();

    await requestLocalAiCoach({
      localVersion: 2,
      recommendation: {
        action: 'play',
        buildPileIndex: 0,
        card: { value: 1, isSkipBo: false },
        reasonCodes: ['play-stock'],
        score: 1001,
        source: 'stock',
        sourceIndex: 0,
      },
    }, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/ai/local/coach', expect.objectContaining({
      body: JSON.stringify({
        localVersion: 2,
        recommendation: {
          action: 'play',
          buildPileIndex: 0,
          card: { value: 1, isSkipBo: false },
          reasonCodes: ['play-stock'],
          score: 1001,
          source: 'stock',
          sourceIndex: 0,
        },
      }),
      method: 'POST',
      signal: controller.signal,
    }));
  });

  it('requests local AI post-game summaries with bounded visible action data', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SKIPBO_API_URL', 'https://api.example.com');

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({
        displayText: 'Résumé: texte amélioré.',
        fallbackUsed: false,
        localVersion: 3,
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { requestLocalAiPostGameSummary } = await import('../api.ts');

    await requestLocalAiPostGameSummary({
      actionLog: [{
        action: 'play',
        buildPileIndex: 0,
        card: { value: 1, isSkipBo: false },
        playerIndex: 0,
        source: 'stock',
        sourceIndex: 0,
        stockCountAfter: 0,
        stockCountBefore: 1,
        version: 3,
      }],
      localVersion: 3,
      playerIndex: 0,
      winnerIndex: 0,
    });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/ai/local/post-game-summary', expect.objectContaining({
      body: JSON.stringify({
        actionLog: [{
          action: 'play',
          buildPileIndex: 0,
          card: { value: 1, isSkipBo: false },
          playerIndex: 0,
          source: 'stock',
          sourceIndex: 0,
          stockCountAfter: 0,
          stockCountBefore: 1,
          version: 3,
        }],
        localVersion: 3,
        playerIndex: 0,
        winnerIndex: 0,
      }),
      method: 'POST',
    }));
  });
});
