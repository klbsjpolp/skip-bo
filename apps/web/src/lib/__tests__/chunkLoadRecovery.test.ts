import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentryAddBreadcrumb = vi.fn();
const sentryCaptureException = vi.fn();

vi.mock('@sentry/react', () => ({
  addBreadcrumb: (...args: unknown[]) => sentryAddBreadcrumb(...args),
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
}));

const reloadMock = vi.fn();

const loadModule = async () => {
  vi.resetModules();
  return import('../chunkLoadRecovery');
};

const dispatchPreloadError = (payload: unknown) => {
  const event = new Event('vite:preloadError', { cancelable: true });
  (event as Event & { payload: unknown }).payload = payload;
  window.dispatchEvent(event);
  return event;
};

const originalLocation = window.location;

describe('chunkLoadRecovery', () => {
  beforeEach(() => {
    sentryAddBreadcrumb.mockClear();
    sentryCaptureException.mockClear();
    reloadMock.mockClear();
    window.sessionStorage.clear();
    // jsdom's location.reload is non-configurable, so swap the whole object.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it('reloads once on the first preload error and records a breadcrumb', async () => {
    const { installChunkLoadRecovery } = await loadModule();
    installChunkLoadRecovery();

    const event = dispatchPreloadError(new Error('Importing a module script failed.'));

    expect(event.defaultPrevented).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(sentryAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'pwa', message: 'chunk-load-recovery:reload' }),
    );
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it('does not reload again within the loop-guard window and surfaces the error', async () => {
    const { handleChunkLoadFailure, CHUNK_RELOAD_TIMESTAMP_KEY } = await loadModule();

    window.sessionStorage.setItem(CHUNK_RELOAD_TIMESTAMP_KEY, String(Date.now()));

    const error = new Error('Importing a module script failed.');
    handleChunkLoadFailure(error);

    expect(reloadMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: { chunkLoadRecovery: 'loop-guard-tripped' } }),
    );
  });

  it('reloads again once the loop-guard window has elapsed', async () => {
    const { handleChunkLoadFailure, CHUNK_RELOAD_TIMESTAMP_KEY, CHUNK_RELOAD_LOOP_GUARD_MS } = await loadModule();

    window.sessionStorage.setItem(CHUNK_RELOAD_TIMESTAMP_KEY, String(Date.now() - CHUNK_RELOAD_LOOP_GUARD_MS - 1));

    handleChunkLoadFailure(new Error('Importing a module script failed.'));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('registers the window listener only once', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const { installChunkLoadRecovery } = await loadModule();

    installChunkLoadRecovery();
    installChunkLoadRecovery();

    const preloadRegistrations = addEventListenerSpy.mock.calls.filter(([type]) => type === 'vite:preloadError');
    expect(preloadRegistrations).toHaveLength(1);
  });
});
