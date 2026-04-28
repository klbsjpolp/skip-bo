// Test-only stub that satisfies the `virtual:pwa-register` import surface
// used by `src/lib/pwaUpdates.ts`. Production builds resolve the virtual
// module via vite-plugin-pwa; vitest aliases this file in instead so tests
// can `vi.mock('virtual:pwa-register', …)` and capture the registration
// callbacks.

type RegisterOptions = {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
};

type UpdateServiceWorker = (reload?: boolean) => Promise<void>;

export const registerSW: (options?: RegisterOptions) => UpdateServiceWorker = () => async () => {};
