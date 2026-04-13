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

export const applyServiceWorkerUpdate = async (): Promise<boolean> => {
  await snapshot.registration?.update().catch(() => undefined);

  if ((snapshot.needRefresh || snapshot.registration?.waiting) && updateServiceWorker) {
    await updateServiceWorker(true);
    return true;
  }

  return false;
};
