import type { Card, GameState, Player, SelectedCard } from '../types/index.js';

export const canPlayCard = (card: Card, buildPileIndex: number, gameState: GameState): boolean => {
  const buildPile = gameState.buildPiles[buildPileIndex];

  if (!Array.isArray(buildPile)) {
    return false;
  }

  if (buildPile.length === 0) {
    return card.isSkipBo || card.value === 1;
  }

  // Use pile length to determine expected value, not the top card's actual value
  // This handles Skip-Bo cards correctly since they maintain their identity but represent the pile position
  const expectedValue = buildPile.length + 1;

  if (expectedValue > gameState.config.CARD_VALUES_MAX) return false;

  return card.isSkipBo || card.value === expectedValue;
};

export const cardsMatch = (candidate: Card | null | undefined, selectedCard: Card): boolean =>
  !!candidate && candidate.value === selectedCard.value && candidate.isSkipBo === selectedCard.isSkipBo;

export const hasValidDiscardPileIndex = (player: Player, discardPileIndex: number): boolean =>
  discardPileIndex >= 0 && discardPileIndex < player.discardPiles.length;

export const hasValidSelectedSource = (player: Player, selectedCard: SelectedCard): boolean => {
  switch (selectedCard.source) {
    case 'hand':
      return (
        selectedCard.index >= 0 &&
        selectedCard.index < player.hand.length &&
        cardsMatch(player.hand[selectedCard.index], selectedCard.card)
      );
    case 'stock':
      return cardsMatch(player.stockPile[player.stockPile.length - 1], selectedCard.card);
    case 'discard':
      return (
        selectedCard.discardPileIndex !== undefined &&
        hasValidDiscardPileIndex(player, selectedCard.discardPileIndex) &&
        cardsMatch(
          player.discardPiles[selectedCard.discardPileIndex][
            player.discardPiles[selectedCard.discardPileIndex].length - 1
          ],
          selectedCard.card,
        )
      );
  }
};
