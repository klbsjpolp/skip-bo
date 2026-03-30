import type { Card } from '@/types';

export interface HandRefillAnimationPlan {
  cards: Card[];
  handIndices: number[];
}

const shuffleCards = (cards: Card[]): void => {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
};

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
    shuffleCards(deckCopy);

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
