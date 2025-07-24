import { Card, GameState } from '@/types';

export const canPlayCard = (card: Card, buildPileIndex: number, gameState: GameState): boolean => {
  const buildPile = gameState.buildPiles[buildPileIndex];

  if (buildPile.length === 0) {
    return card.isSkipBo || card.value === 1;
  }

  // Use pile length to determine expected value, not the top card's actual value
  // This handles Skip-Bo cards correctly since they maintain their identity but represent the pile position
  const expectedValue = buildPile.length + 1;

  if (expectedValue > 12) return false;

  return card.isSkipBo || card.value === expectedValue;
};