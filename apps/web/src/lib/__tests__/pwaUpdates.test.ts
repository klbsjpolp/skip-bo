import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RegistrationCallbacks {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}

const updateServiceWorkerMock = vi.fn<(reload?: boolean) => Promise<void>>(async () => undefined);
let registerOptions: RegistrationCallbacks = {};

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: RegistrationCallbacks) => {
    registerOptions = options;
    return updateServiceWorkerMock;
  },
}));

const sentryAddBreadcrumb = vi.fn();
const sentryCaptureException = vi.fn();
const sentryCaptureMessage = vi.fn();

vi.mock('@sentry/react', () => ({
  addBreadcrumb: (...args: unknown[]) => sentryAddBreadcrumb(...args),
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  captureMessage: (...args: unknown[]) => sentryCaptureMessage(...args),
}));

class FakeServiceWorker extends EventTarget implements Partial<ServiceWorker> {
  state: ServiceWorkerState = 'installing';

  setState(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

// EventTarget so the production code can listen for `updatefound`.
class FakeRegistration extends EventTarget {
  installing: FakeServiceWorker | null = null;
  waiting: FakeServiceWorker | null = null;
  active: FakeServiceWorker | null = null;
  update = vi.fn().mockResolvedValue(undefined);
}

const buildFakeRegistration = (): FakeRegistration => new FakeRegistration();

const loadPwaUpdates = async () => {
  vi.resetModules();
  registerOptions = {};
  updateServiceWorkerMock.mockClear();
  return import('../pwaUpdates');
};

describe('pwaUpdates', () => {
  beforeEach(() => {
    updateServiceWorkerMock.mockReset();
    updateServiceWorkerMock.mockResolvedValue(undefined);
    sentryAddBreadcrumb.mockClear();
    sentryCaptureException.mockClear();
    sentryCaptureMessage.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call updateServiceWorker when no installing or waiting worker is found', async () => {
    vi.useFakeTimers();

    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const pending = applyServiceWorkerUpdate();
    // Sit out the `updatefound` grace window — no worker ever surfaces.
    await vi.advanceTimersByTimeAsync(5000);
    const applied = await pending;

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(updateServiceWorkerMock).not.toHaveBeenCalled();
    expect(applied).toBe(false);
    expect(sentryCaptureMessage).toHaveBeenCalledWith('pwa.apply-update.no-waiting-worker', 'warning');
  });

  it('applies an update that surfaces via updatefound after registration.update() resolves', async () => {
    vi.useFakeTimers();

    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const pending = applyServiceWorkerUpdate();
    // update() has resolved with nothing staged; the grace listener is armed.
    await vi.advanceTimersByTimeAsync(0);

    const installingWorker = new FakeServiceWorker();
    registration.installing = installingWorker;
    registration.dispatchEvent(new Event('updatefound'));
    await vi.advanceTimersByTimeAsync(0);

    registration.installing = null;
    registration.waiting = installingWorker;
    installingWorker.setState('installed');

    const applied = await pending;

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
    expect(applied).toBe(true);
  });

  it('reports a captured exception when the registration update rejects', async () => {
    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    const updateError = new Error('network down');
    registration.update.mockRejectedValue(updateError);
    registration.waiting = new FakeServiceWorker();
    registration.waiting.state = 'installed';

    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const applied = await applyServiceWorkerUpdate();

    expect(sentryCaptureException).toHaveBeenCalledWith(updateError);
    // A waiting worker is still present, so the update is applied despite the
    // failed `registration.update()` refresh.
    expect(applied).toBe(true);
  });

  it('waits for an installing worker to finish before applying the update', async () => {
    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    const installingWorker = new FakeServiceWorker();
    installingWorker.state = 'installing';
    registration.installing = installingWorker;

    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const pending = applyServiceWorkerUpdate();

    await Promise.resolve();
    expect(updateServiceWorkerMock).not.toHaveBeenCalled();

    registration.installing = null;
    registration.waiting = installingWorker;
    installingWorker.setState('installed');

    const applied = await pending;

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
    expect(applied).toBe(true);
  });

  it('falls through gracefully when the installing worker becomes redundant', async () => {
    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    const installingWorker = new FakeServiceWorker();
    registration.installing = installingWorker;

    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const pending = applyServiceWorkerUpdate();

    registration.installing = null;
    installingWorker.setState('redundant');

    const applied = await pending;

    expect(updateServiceWorkerMock).not.toHaveBeenCalled();
    expect(applied).toBe(false);
  });

  it('applies the update immediately when a waiting worker is already present', async () => {
    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    registration.waiting = new FakeServiceWorker();
    registration.waiting.state = 'installed';

    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const applied = await applyServiceWorkerUpdate();

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
    expect(applied).toBe(true);
  });

  it('invokes onReloadCommitted only when a reload actually fires', async () => {
    vi.useFakeTimers();

    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const onReloadCommitted = vi.fn();

    // No waiting worker → no reload → callback must not fire (so the caller's
    // per-version guard isn't burned on a no-op apply).
    const noWorker = buildFakeRegistration();
    registerOptions.onRegisteredSW?.('/sw.js', noWorker as unknown as ServiceWorkerRegistration);
    const noWorkerPending = applyServiceWorkerUpdate(onReloadCommitted);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await noWorkerPending).toBe(false);
    expect(onReloadCommitted).not.toHaveBeenCalled();

    // Waiting worker present → reload fires → callback runs once, before the
    // activate + reload.
    const withWorker = buildFakeRegistration();
    withWorker.waiting = new FakeServiceWorker();
    withWorker.waiting.state = 'installed';
    registerOptions.onRegisteredSW?.('/sw.js', withWorker as unknown as ServiceWorkerRegistration);
    expect(await applyServiceWorkerUpdate(onReloadCommitted)).toBe(true);
    expect(onReloadCommitted).toHaveBeenCalledTimes(1);
    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
  });

  it('times out the install wait so the promise never hangs forever', async () => {
    vi.useFakeTimers();

    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    registration.installing = new FakeServiceWorker();

    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const pending = applyServiceWorkerUpdate();

    await vi.advanceTimersByTimeAsync(10_000);

    const applied = await pending;

    expect(updateServiceWorkerMock).not.toHaveBeenCalled();
    expect(applied).toBe(false);
    expect(sentryCaptureMessage).toHaveBeenCalledWith('pwa.apply-update.install-timeout', 'warning');
  });

  describe('forceReloadIfNotStaged', () => {
    const originalLocation = window.location;
    const reloadMock = vi.fn();
    const unregisterMock = vi.fn().mockResolvedValue(true);
    const cacheKeysMock = vi.fn().mockResolvedValue(['workbox-precache-v2']);
    const cacheDeleteMock = vi.fn().mockResolvedValue(true);

    beforeEach(() => {
      reloadMock.mockClear();
      unregisterMock.mockClear();
      cacheKeysMock.mockClear();
      cacheDeleteMock.mockClear();

      // jsdom's location.reload is non-configurable, so swap the whole object.
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, reload: reloadMock },
      });
      Object.defineProperty(window.navigator, 'serviceWorker', {
        configurable: true,
        value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister: unregisterMock }]) },
      });
      vi.stubGlobal('caches', { keys: cacheKeysMock, delete: cacheDeleteMock });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
      Reflect.deleteProperty(window.navigator, 'serviceWorker');
      vi.unstubAllGlobals();
    });

    it('drops the worker and its caches, then reloads, when no update can be staged', async () => {
      vi.useFakeTimers();

      const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
      initializePwaUpdates();

      const registration = buildFakeRegistration();
      registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

      const onReloadCommitted = vi.fn();
      const pending = applyServiceWorkerUpdate(onReloadCommitted, { forceReloadIfNotStaged: true });
      await vi.advanceTimersByTimeAsync(5000);
      const applied = await pending;

      expect(applied).toBe(true);
      expect(unregisterMock).toHaveBeenCalledTimes(1);
      expect(cacheDeleteMock).toHaveBeenCalledWith('workbox-precache-v2');
      expect(onReloadCommitted).toHaveBeenCalledTimes(1);
      expect(reloadMock).toHaveBeenCalledTimes(1);
      expect(updateServiceWorkerMock).not.toHaveBeenCalled();
      expect(sentryCaptureMessage).toHaveBeenCalledWith('pwa.apply-update.force-refresh', 'warning');
      expect(sentryCaptureMessage).not.toHaveBeenCalledWith('pwa.apply-update.no-waiting-worker', 'warning');
    });

    it('prefers a cleanly staged worker over the force reload', async () => {
      const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
      initializePwaUpdates();

      const registration = buildFakeRegistration();
      registration.waiting = new FakeServiceWorker();
      registration.waiting.state = 'installed';
      registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

      const applied = await applyServiceWorkerUpdate(undefined, { forceReloadIfNotStaged: true });

      expect(applied).toBe(true);
      expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
      expect(reloadMock).not.toHaveBeenCalled();
      expect(unregisterMock).not.toHaveBeenCalled();
    });

    it('force-reloads even when the service worker never registered', async () => {
      // Also drop serviceWorker/CacheStorage support entirely — the cleanup must
      // tolerate their absence, not just empty results.
      Reflect.deleteProperty(window.navigator, 'serviceWorker');
      vi.unstubAllGlobals();

      const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
      initializePwaUpdates();

      // No onRegisteredSW callback — snapshot.registration is null.
      const applied = await applyServiceWorkerUpdate(undefined, { forceReloadIfNotStaged: true });

      expect(applied).toBe(true);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it('returns false with no registration when force is not requested', async () => {
      const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
      initializePwaUpdates();

      const applied = await applyServiceWorkerUpdate();

      expect(applied).toBe(false);
      expect(reloadMock).not.toHaveBeenCalled();
    });

    it('still reloads when unregistering or cache cleanup fails', async () => {
      Object.defineProperty(window.navigator, 'serviceWorker', {
        configurable: true,
        value: { getRegistrations: vi.fn().mockRejectedValue(new Error('sw registry unavailable')) },
      });
      cacheKeysMock.mockRejectedValueOnce(new Error('cache storage unavailable'));

      const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
      initializePwaUpdates();

      const applied = await applyServiceWorkerUpdate(undefined, { forceReloadIfNotStaged: true });

      expect(applied).toBe(true);
      expect(sentryCaptureException).toHaveBeenCalledTimes(2);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it('does not force-reload while offline (a reload would strand the client)', async () => {
      vi.useFakeTimers();

      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      try {
        const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
        initializePwaUpdates();

        const registration = buildFakeRegistration();
        registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

        const pending = applyServiceWorkerUpdate(undefined, { forceReloadIfNotStaged: true });
        await vi.advanceTimersByTimeAsync(5000);
        const applied = await pending;

        expect(applied).toBe(false);
        expect(reloadMock).not.toHaveBeenCalled();
        expect(sentryCaptureMessage).toHaveBeenCalledWith('pwa.apply-update.no-waiting-worker', 'warning');
      } finally {
        Reflect.deleteProperty(window.navigator, 'onLine');
      }
    });
  });
});
