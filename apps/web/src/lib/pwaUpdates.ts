import { registerSW } from 'virtual:pwa-register';

type Listener = () => void;
type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export interface PwaUpdateSnapshot {
  needRefresh: boolean;
  offlineReady: boolean;
  registration: ServiceWorkerRegistration | null;
  registrationError: Error | null;
}

const listeners = new Set<Listener>();

let initialized = false;
let updateServiceWorker: UpdateServiceWorker | null = null;
let snapshot: PwaUpdateSnapshot = {
  needRefresh: false,
  offlineReady: false,
  registration: null,
  registrationError: null,
};

const emitSnapshot = () => {
  listeners.forEach((listener) => listener());
};

const updateSnapshot = (partialSnapshot: Partial<PwaUpdateSnapshot>) => {
  snapshot = {
    ...snapshot,
    ...partialSnapshot,
  };
  emitSnapshot();
};

const toRegistrationError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Service worker registration failed.');

export const initializePwaUpdates = () => {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;
  updateServiceWorker = registerSW({
    onNeedRefresh() {
      updateSnapshot({needRefresh: true});
    },
    onOfflineReady() {
      console.info('App ready to work offline');
      updateSnapshot({offlineReady: true});
    },
    onRegisteredSW(_swScriptUrl, registration) {
      updateSnapshot({
        registration: registration ?? null,
        registrationError: null,
      });
    },
    onRegisterError(error) {
      updateSnapshot({registrationError: toRegistrationError(error)});
    },
  });
};

export const getPwaUpdateSnapshot = () => snapshot;

export const subscribeToPwaUpdates = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const refreshServiceWorkerRegistration = async (): Promise<void> => {
  await snapshot.registration?.update();
};

const SERVICE_WORKER_INSTALL_TIMEOUT_MS = 8000;

const waitForInstallingWorker = (worker: ServiceWorker, timeoutMs: number): Promise<void> =>
  new Promise<void>((resolve) => {
    if (worker.state !== 'installing') {
      resolve();
      return;
    }

    const handleStateChange = () => {
      if (worker.state !== 'installing') {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      worker.removeEventListener('statechange', handleStateChange);
      globalThis.clearTimeout(timeoutId);
    };

    const timeoutId = globalThis.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    worker.addEventListener('statechange', handleStateChange);
  });

export const applyServiceWorkerUpdate = async (): Promise<boolean> => {
  const registration = snapshot.registration;
  if (!registration || !updateServiceWorker) {
    return false;
  }

  await registration.update().catch(() => undefined);

  // `registration.update()` resolves once the browser has *checked* for a new
  // worker, but a freshly fetched worker is still in the `installing` state.
  // Wait until it transitions out before deciding whether to apply the update,
  // otherwise iOS PWAs reach the `location.reload()` fallback below while the
  // new worker is still installing — serving the stale precached bundle and
  // looping the splash → blank screen → reload cycle.
  if (registration.installing) {
    await waitForInstallingWorker(registration.installing, SERVICE_WORKER_INSTALL_TIMEOUT_MS);
  }

  if (snapshot.needRefresh || registration.waiting) {
    await updateServiceWorker(true);
    return true;
  }

  return false;
};
