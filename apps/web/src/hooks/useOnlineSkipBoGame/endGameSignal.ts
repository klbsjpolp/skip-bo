/**
 * Host-side bookkeeping for the deferred `endGame` message.
 *
 * The host may not send `endGame` the moment the game is over. The server marks
 * the room FINISHED on `endGame` and then rejects every relay (409), while the
 * authoritative end-of-game stats record — the one all seats display — is only
 * produced a render later, when the stats recorder observes the final view. So
 * `endGame` is *armed* when the game ends and only *flushed* once the record is
 * on the wire.
 *
 * Two rules make the room always reach FINISHED without ever double-signalling:
 *
 * - A fallback timer flushes anyway if the record never materializes (e.g. the
 *   recorder never opened one after a host reconnect).
 * - `endGame` goes out at most once per game: arming is refused after a flush,
 *   and a flush with nothing armed is a no-op. A record arriving *after* the
 *   timer already fired must not send a second `endGame`.
 */

/**
 * How long the host waits for its own end-of-game stats record before sending
 * `endGame` anyway. The record normally arrives on the very next render; this
 * is only the safety net that guarantees the room reaches FINISHED.
 */
export const END_GAME_STATS_GRACE_MS = 3000;

export interface EndGameSignal {
  /**
   * Defer `endGame` for `winnerSeatIndex` and start the fallback timer.
   * No-op once armed or once already sent, so it is safe to call on every
   * authority push while the game sits finished.
   */
  arm(winnerSeatIndex: number | null): void;
  /**
   * Send the armed `endGame` now and cancel the fallback timer. No-op when
   * nothing is armed — including after a previous flush.
   */
  flush(): void;
  /** Clear the fallback timer without sending (unmount). */
  dispose(): void;
  /** Whether an `endGame` is armed and not yet sent. Exposed for assertions. */
  isArmed(): boolean;
  /** Whether `endGame` has already gone out. Exposed for assertions. */
  isSent(): boolean;
}

export interface EndGameSignalOptions {
  /**
   * Sends the `endGame` message. Called at most once per signal. Declared as a
   * property rather than a method so destructuring it does not trip
   * `@typescript-eslint/unbound-method`.
   */
  send: (winnerSeatIndex: number | null) => void;
  /** Fallback delay; defaults to {@link END_GAME_STATS_GRACE_MS}. */
  graceMs?: number;
}

export const createEndGameSignal = ({
  send,
  graceMs = END_GAME_STATS_GRACE_MS,
}: EndGameSignalOptions): EndGameSignal => {
  let pending: { winnerSeatIndex: number | null } | null = null;
  let timeoutId: number | null = null;
  let sent = false;

  const clearTimer = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const flush = () => {
    if (!pending) return;
    const { winnerSeatIndex } = pending;
    pending = null;
    clearTimer();
    sent = true;
    send(winnerSeatIndex);
  };

  return {
    arm: (winnerSeatIndex) => {
      if (sent || pending) return;
      pending = { winnerSeatIndex };
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        flush();
      }, graceMs);
    },
    flush,
    dispose: clearTimer,
    isArmed: () => pending !== null,
    isSent: () => sent,
  };
};
