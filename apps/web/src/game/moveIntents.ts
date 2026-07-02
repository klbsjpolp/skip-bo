import {
  canPlayCard,
  getCompletedBuildPileCards,
  planPostPlayRefill,
  willPlayCardEmptyHand,
  type Card,
  type GameState,
  type HandRefillAnimationPlan,
  type SelectedCard,
} from '@skipbo/game-core';

/**
 * Shared client-side move pipeline for both game modes. The local hook, the
 * online hook, and the machine's bot actor all validate and plan a move
 * through here, so rule changes and their French error strings live in one
 * place instead of four.
 */

export type PlayCardIntent =
  | { valid: false; error: string }
  | {
      valid: true;
      /** The validated selection (narrowed for callers that animate it). */
      selectedCard: SelectedCard;
      /** Whether this play empties the hand and triggers the reducer's refill. */
      willEmptyHand: boolean;
      /** Cards/slots the empty-hand refill will fill (empty plan when none). */
      refillPlan: HandRefillAnimationPlan;
      /** The 12 cards retreating off the pile when this play completes it, else null. */
      completedBuildPileCards: Card[] | null;
    };

export type DiscardCardIntent = { valid: false; error: string } | { valid: true; selectedCard: SelectedCard };

export const preparePlayCardIntent = (state: GameState, buildPile: number): PlayCardIntent => {
  if (!state.selectedCard) {
    return { valid: false, error: 'Aucune carte sélectionnée' };
  }

  if (!canPlayCard(state.selectedCard.card, buildPile, state)) {
    return { valid: false, error: 'Vous ne pouvez pas jouer cette carte' };
  }

  const willEmptyHand = willPlayCardEmptyHand(state);

  return {
    valid: true,
    selectedCard: state.selectedCard,
    willEmptyHand,
    refillPlan: willEmptyHand ? planPostPlayRefill(state) : { cards: [], handIndices: [] },
    completedBuildPileCards: getCompletedBuildPileCards(state, buildPile),
  };
};

export const prepareDiscardCardIntent = (state: GameState): DiscardCardIntent => {
  if (!state.selectedCard) {
    return { valid: false, error: 'Aucune carte sélectionnée' };
  }

  if (state.selectedCard.source !== 'hand') {
    return { valid: false, error: 'Vous devez défausser une carte de votre main' };
  }

  return { valid: true, selectedCard: state.selectedCard };
};
