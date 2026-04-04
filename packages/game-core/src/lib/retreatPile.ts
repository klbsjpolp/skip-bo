import type { Card, GameState } from '../types/index.js';

export const RETREAT_PILE_PREVIEW_LIMIT = 3;

const RETREAT_PILE_ANGLE_PATTERN = [-2.5, 0, 2.5, 1.5, -1.5];

export const getRetreatPileAngle = (index: number): number =>
  RETREAT_PILE_ANGLE_PATTERN[index % RETREAT_PILE_ANGLE_PATTERN.length];

export const getCompletedBuildPileCards = (
  gameState: GameState,
  buildPileIndex: number,
): Card[] | null => {
  const buildPile = gameState.buildPiles[buildPileIndex];
  const selectedCard = gameState.selectedCard;

  if (!Array.isArray(buildPile) || !selectedCard) {
    return null;
  }

  if (buildPile.length + 1 !== gameState.config.CARD_VALUES_MAX) {
    return null;
  }

  return [...buildPile.map((card) => ({ ...card })), { ...selectedCard.card }];
};
