// Heartbeat ping the client sends to the realtime API. AWS API Gateway closes
// idle WebSocket connections after ~10 minutes; 4 minutes keeps us well below.
export const WEBSOCKET_PING_INTERVAL_MS = 4 * 60 * 1000;

// Backoff schedule for reconnect attempts on the realtime WebSocket. After the
// last entry we stop retrying automatically and surface a disconnected status.
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 2_000, 5_000];

// Grace window the server keeps a disconnected seat reserved before reclaim.
// Must match DISCONNECT_GRACE_MS in apps/realtime-api/src/services/roomService.ts.
export const DISCONNECT_GRACE_MS = 5 * 60 * 1000;

// How often usePwaVersionGate polls runtime-config + the service worker to
// detect that a new web release has been deployed.
export const PWA_UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;

// Minimum gap between event-driven update rechecks (visibility/pageshow/online).
// Mobile app-switching fires these in bursts; this throttle collapses redundant
// `registration.update()` + runtime-config fetches. The periodic poll above is
// unaffected.
export const PWA_UPDATE_RECHECK_MIN_INTERVAL_MS = 30 * 1000;

// Window after launch during which a pending soft update is applied
// automatically (local mode only). Players typically open the app and start
// playing before the new service worker finishes downloading, so the
// "apply on New Game" path never fires for them. The local game is always
// freshly dealt on launch, so reloading within this window loses nothing; the
// margin is generous enough to outlast a slow bundle download. After it
// elapses we revert to the deferred behavior so an in-progress game is never
// reloaded out from under the player by a background update.
export const PWA_LAUNCH_AUTO_UPDATE_WINDOW_MS = 60 * 1000;
