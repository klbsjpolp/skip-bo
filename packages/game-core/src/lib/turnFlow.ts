import { getActivePlayer } from '../selectors/index.js';
import type { GameAction } from '../state/gameActions.js';
import type { GameState } from '../types/index.js';
import { planHandRefill, type HandRefillAnimationPlan } from './handRefill.js';

export interface StartOfTurnDraw {
  /** The reducer action that performs the start-of-turn draw. */
  action: Extract<GameAction, { type: 'DRAW' }>;
  /** The cards/slots that draw will fill, for animation. */
  plan: HandRefillAnimationPlan;
}

/**
 * Single owner of the turn-boundary rule: when the turn advances, the new
 * current player refills their hand (draws stay outside END_TURN/DISCARD_CARD
 * per the runtime invariants). Call this with the state where
 * `currentPlayerIndex` already points at the player whose turn is starting.
 * The local turn machine's draw actor and the online runtime's
 * `applyOnlineAction` both delegate here so draw timing has one owner.
 */
export const planStartOfTurnDraw = (state: GameState): StartOfTurnDraw => {
  const plan = planHandRefill(getActivePlayer(state).hand, state.deck, state.completedBuildPiles);

  return { action: { type: 'DRAW', count: plan.cards.length }, plan };
};
