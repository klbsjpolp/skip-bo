import * as Sentry from '@sentry/react';
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
      updateSnapshot({ needRefresh: true });
    },
    onOfflineReady() {
      console.info('App ready to work offline');
      updateSnapshot({ offlineReady: true });
    },
    onRegisteredSW(_swScriptUrl, registration) {
      updateSnapshot({
        registration: registration ?? null,
        registrationError: null,
      });
    },
    onRegisterError(error) {
      const registrationError = toRegistrationError(error);
      Sentry.captureException(registrationError);
      updateSnapshot({ registrationError });
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

type InstallWaitResult = 'settled' | 'timeout';

const waitForInstallingWorker = (worker: ServiceWorker, timeoutMs: number): Promise<InstallWaitResult> =>
  new Promise<InstallWaitResult>((resolve) => {
    if (worker.state !== 'installing') {
      resolve('settled');
      return;
    }

    const handleStateChange = () => {
      if (worker.state !== 'installing') {
        cleanup();
        resolve('settled');
      }
    };

    const cleanup = () => {
      worker.removeEventListener('statechange', handleStateChange);
      globalThis.clearTimeout(timeoutId);
    };

    const timeoutId = globalThis.setTimeout(() => {
      cleanup();
      resolve('timeout');
    }, timeoutMs);

    worker.addEventListener('statechange', handleStateChange);
  });

// `onReloadCommitted` runs at the single instant the update is about to be
// applied — after a waiting worker is confirmed, just before the activate +
// reload. Callers use it to record a per-version guard that must survive the
// reload yet must not be written on the no-op path (no waiting worker), so a
// transient miss doesn't burn that version's one attempt.
export const applyServiceWorkerUpdate = async (onReloadCommitted?: () => void): Promise<boolean> => {
  const registration = snapshot.registration;
  if (!registration || !updateServiceWorker) {
    return false;
  }

  Sentry.addBreadcrumb({ category: 'pwa', message: 'apply-update:start', level: 'info' });

  await registration.update().catch((error: unknown) => {
    Sentry.captureException(error);
  });

  // `registration.update()` resolves before a freshly fetched worker leaves
  // `installing`. Wait it out so the `waiting`/`needRefresh` check below
  // doesn't false-negative and skip an available update.
  if (registration.installing) {
    const installResult = await waitForInstallingWorker(registration.installing, SERVICE_WORKER_INSTALL_TIMEOUT_MS);
    if (installResult === 'timeout') {
      Sentry.captureMessage('pwa.apply-update.install-timeout', 'warning');
    }
  }

  if (snapshot.needRefresh || registration.waiting) {
    onReloadCommitted?.();
    await updateServiceWorker(true);
    return true;
  }

  // No worker is staged yet: this is the runtime-config channel advertising a
  // version the service worker hasn't fetched (see usePwaVersionGate's updateKey
  // self-heal note). The caller's per-key guard prevents a reload loop; surface
  // it so a genuinely stuck client is visible in telemetry rather than silent.
  Sentry.captureMessage('pwa.apply-update.no-waiting-worker', 'warning');
  return false;
};
