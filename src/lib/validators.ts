import { Card, GameState } from '@/types';

export const canPlayCard = (card: Card, buildPileIndex: number, gameState: GameState): boolean => {
  const buildPile = gameState.buildPiles[buildPileIndex];

  if (buildPile.length === 0) {
    return card.isSkipBo || card.value === 1;
  }

  const topCard = buildPile[buildPile.length - 1];
  const expectedValue = topCard.value + 1;

  if (expectedValue > 12) return false;

  return card.isSkipBo || card.value === expectedValue;
};