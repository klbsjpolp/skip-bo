/**
 * Apply a pending soft update at the moment the player creates or joins an
 * online room — the last lossless moment before a room code exists to share.
 * The lobby itself is not a safe auto-apply moment (the dialog is showing the
 * code; see OnlineGameScreen), so this deliberate action is where a pending
 * update lands instead.
 *
 * Resolves true when a reload actually committed: the caller must abort the
 * start, since the page is about to boot into the new build. Resolves false
 * when there is nothing to apply or no service worker is staged yet (the
 * `runtime:` channel can advertise a version before the worker has fetched
 * it) — the caller proceeds so a lagging download can't block starting a game.
 */
export const applyPendingUpdateBeforeOnlineStart = async (
  isUpdatePending: boolean,
  reloadToUpdate: () => Promise<boolean>,
): Promise<boolean> => (isUpdatePending ? reloadToUpdate() : false);
