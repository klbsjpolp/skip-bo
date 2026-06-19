import type { GameState } from '@/types';

/**
 * Whether a pending PWA update can be applied to a local game without losing
 * anything. A local reload always re-deals a fresh game (it isn't persisted), so
 * the only lossless moment is before the player has touched the freshly dealt
 * game: nothing played to a build pile, no build pile completed, and nobody has
 * discarded yet. A start-of-turn draw doesn't count. Online's equivalent
 * safe-moment gate lives in OnlineGameScreen.
 */
export const isSafeToApplyLocalUpdate = (gameState: GameState): boolean =>
  !gameState.gameIsOver &&
  gameState.buildPiles.every((pile) => pile.length === 0) &&
  gameState.completedBuildPiles.length === 0 &&
  gameState.players.every((player) => player.discardPiles.every((pile) => pile.length === 0));
