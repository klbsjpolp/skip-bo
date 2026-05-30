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

interface FakeRegistration {
  installing: FakeServiceWorker | null;
  waiting: FakeServiceWorker | null;
  active: FakeServiceWorker | null;
  update: ReturnType<typeof vi.fn>;
}

const buildFakeRegistration = (): FakeRegistration => ({
  installing: null,
  waiting: null,
  active: null,
  update: vi.fn().mockResolvedValue(undefined),
});

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
    const { initializePwaUpdates, applyServiceWorkerUpdate } = await loadPwaUpdates();
    initializePwaUpdates();

    const registration = buildFakeRegistration();
    registerOptions.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);

    const applied = await applyServiceWorkerUpdate();

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(updateServiceWorkerMock).not.toHaveBeenCalled();
    expect(applied).toBe(false);
    expect(sentryCaptureMessage).toHaveBeenCalledWith('pwa.apply-update.no-waiting-worker', 'warning');
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
});
