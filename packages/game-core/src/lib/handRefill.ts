import type { Card, GameState, Player } from '../types/index.js';
import { shuffleInPlace } from './shuffle.js';

export interface HandRefillAnimationPlan {
  cards: Card[];
  handIndices: number[];
}

export const planHandRefill = (
  hand: (Card | null)[],
  deck: Card[],
  completedBuildPiles: Card[],
): HandRefillAnimationPlan => {
  const handCopy = [...hand];
  const cards: Card[] = [];
  const handIndices: number[] = [];
  let remainingToDraw = Math.min(
    handCopy.filter((card) => card === null).length,
    deck.length + completedBuildPiles.length,
  );

  if (remainingToDraw === 0) {
    return { cards, handIndices };
  }

  const deckCopy = [...deck];

  for (let i = 0; i < handCopy.length && remainingToDraw > 0; i++) {
    if (handCopy[i] === null && deckCopy.length > 0) {
      const nextCard = deckCopy.shift()!;
      cards.push(nextCard);
      handIndices.push(i);
      handCopy[i] = nextCard;
      remainingToDraw--;
    }
  }

  if (remainingToDraw > 0 && completedBuildPiles.length > 0) {
    deckCopy.push(...completedBuildPiles);
    shuffleInPlace(deckCopy);

    for (let i = 0; i < handCopy.length && remainingToDraw > 0; i++) {
      if (handCopy[i] === null && deckCopy.length > 0) {
        const nextCard = deckCopy.shift()!;
        cards.push(nextCard);
        handIndices.push(i);
        handCopy[i] = nextCard;
        remainingToDraw--;
      }
    }
  }

  return { cards, handIndices };
};

/**
 * Fill `player.hand`'s `null` slots from `draft.deck`, reshuffling
 * `draft.completedBuildPiles` back into the deck if more cards are needed.
 * Mutates the Immer draft in place. `requestedCount` defaults to filling all
 * empty slots (bounded by what's available).
 */
export const refillHand = (draft: GameState, player: Player, requestedCount?: number): void => {
  const emptySlots = player.hand.filter((card) => card === null).length;
  let remainingToDraw = requestedCount ?? Math.min(emptySlots, draft.deck.length + draft.completedBuildPiles.length);

  if (remainingToDraw === 0) {
    return;
  }

  for (let i = 0; i < player.hand.length && remainingToDraw > 0; i++) {
    if (player.hand[i] === null && draft.deck.length > 0) {
      player.hand[i] = draft.deck.shift()!;
      remainingToDraw--;
    }
  }

  if (remainingToDraw > 0 && draft.completedBuildPiles.length > 0) {
    draft.deck.push(...draft.completedBuildPiles);
    draft.completedBuildPiles = [];
    shuffleInPlace(draft.deck);

    for (let i = 0; i < player.hand.length && remainingToDraw > 0 && draft.deck.length > 0; i++) {
      if (player.hand[i] === null) {
        player.hand[i] = draft.deck.shift()!;
        remainingToDraw--;
      }
    }
  }
};
