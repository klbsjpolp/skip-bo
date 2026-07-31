/**
 * Guest-side bookkeeping for authoritative view echoes.
 *
 * The host answers every relayed move with exactly one view (the new state on
 * success, a correction on rejection). While more than one echo is outstanding
 * — e.g. a drag sends SELECT_CARD then PLAY_CARD within a round-trip — the
 * earlier echoes are snapshots taken before the latest local action: rendering
 * them would briefly revert the optimistic play and make the reappearing hand
 * card look like a deck→hand draw. Only the final echo is rendered.
 *
 * Outstanding echoes belong to a socket + host lifetime: after a reconnect or a
 * server-side rejection the missing echoes never arrive, so the counter must be
 * reset or the next view (resync or correction) would be swallowed.
 */
export interface ViewEchoTracker {
  /** Count one echo the host now owes us for a move sent optimistically. */
  expectEcho(): void;
  /** Number of echoes still outstanding. Exposed for assertions/debugging. */
  pending(): number;
  /**
   * Consume an incoming relayed view. `true` means render it; `false` means it
   * is a stale echo that should only be recorded as the authoritative fallback.
   */
  shouldRender(): boolean;
  /** Drop all outstanding echoes (reconnect, actionRejected). */
  reset(): void;
}

export const createViewEchoTracker = (): ViewEchoTracker => {
  let pendingEchoes = 0;

  return {
    expectEcho: () => {
      pendingEchoes += 1;
    },
    pending: () => pendingEchoes,
    shouldRender: () => {
      if (pendingEchoes > 0) {
        pendingEchoes -= 1;
        if (pendingEchoes > 0) {
          return false;
        }
      }

      return true;
    },
    reset: () => {
      pendingEchoes = 0;
    },
  };
};
