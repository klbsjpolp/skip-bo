import * as Sentry from '@sentry/react';

// A code-split chunk can fail to load — surfacing on iOS Safari as
// `TypeError: Importing a module script failed.` — when a client running a stale
// precached build dynamically imports a hashed chunk that a newer deploy has
// already replaced on the origin (the classic GitHub Pages / PWA stale-deploy
// race). Reloading re-serves an internally consistent build (the precache, or a
// freshly staged one) and recovers; the timestamp guard below keeps a genuinely
// broken deploy from looping splash → blank → reload forever.
export const CHUNK_RELOAD_TIMESTAMP_KEY = 'skipbo:chunk-reload-at';

// If a chunk failure recurs within this window of our own recovery reload, the
// reload didn't fix it — stop reloading and surface the error instead.
export const CHUNK_RELOAD_LOOP_GUARD_MS = 10_000;

const readLastReloadAt = (): number => {
  try {
    const raw = globalThis.sessionStorage?.getItem(CHUNK_RELOAD_TIMESTAMP_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const writeLastReloadAt = (at: number) => {
  try {
    globalThis.sessionStorage?.setItem(CHUNK_RELOAD_TIMESTAMP_KEY, String(at));
  } catch {
    // private mode / disabled storage — silently no-op
  }
};

let installed = false;

export const handleChunkLoadFailure = (error: unknown): void => {
  const at = Date.now();

  // Loop guard: a second failure right after our recovery reload means the
  // reload didn't help (the chunk is genuinely gone or the service worker is
  // wedged). Capture it so it's visible in telemetry rather than reload-looping.
  if (at - readLastReloadAt() < CHUNK_RELOAD_LOOP_GUARD_MS) {
    Sentry.captureException(error, { tags: { chunkLoadRecovery: 'loop-guard-tripped' } });
    return;
  }

  Sentry.addBreadcrumb({ category: 'pwa', message: 'chunk-load-recovery:reload', level: 'warning' });
  writeLastReloadAt(at);
  globalThis.location.reload();
};

export const installChunkLoadRecovery = (): void => {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;

  // Vite dispatches `vite:preloadError` on window when a dynamically imported
  // module (here: the lazily loaded OnlineGameScreen chunk) fails to load.
  // preventDefault() stops Vite from rethrowing so we own the recovery instead
  // of the error propagating past Suspense and crashing the app.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    handleChunkLoadFailure(event.payload);
  });
};
