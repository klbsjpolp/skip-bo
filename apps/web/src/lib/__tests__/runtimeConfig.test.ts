import {afterEach, describe, expect, it, vi} from 'vitest';

const makeJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });

describe('runtimeConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the last good runtime config when a forced refresh fails', async () => {
    vi.resetModules();

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeJsonResponse({apiBaseUrl: 'https://runtime.example.com/', appVersion: 'v1.0.0'}))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const {fetchRuntimeConfig} = await import('../runtimeConfig');

    await expect(fetchRuntimeConfig()).resolves.toEqual({
      apiBaseUrl: 'https://runtime.example.com/',
      appVersion: 'v1.0.0',
    });

    await expect(fetchRuntimeConfig({force: true})).resolves.toEqual({
      apiBaseUrl: 'https://runtime.example.com/',
      appVersion: 'v1.0.0',
    });
  });
});
