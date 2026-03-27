import { Card, GameState, Player } from '@/types';
import { canPlayCard } from '@/lib/validators';

export const getAIPlayer = (
  gameState: GameState,
  playerIndex: number = gameState.currentPlayerIndex
): Player => gameState.players[playerIndex];

export const getTopStockCard = (player: Player): Card | null =>
  player.stockPile[player.stockPile.length - 1] ?? null;

export const getNextBuildValue = (buildPile: Card[]): number => buildPile.length + 1;

export const collectNeededValues = (
  gameState: GameState,
  lookaheadSteps: number = 1
): Set<number> => {
  const neededValues = new Set<number>();

  gameState.buildPiles.forEach((pile) => {
    const nextValue = getNextBuildValue(pile);

    for (let offset = 0; offset < lookaheadSteps; offset++) {
      const value = nextValue + offset;
      if (value >= 1 && value <= 12) {
        neededValues.add(value);
      }
    }
  });

  return neededValues;
};

export const getPlayableBuildPiles = (
  card: Card,
  gameState: GameState
): number[] =>
  gameState.buildPiles.reduce<number[]>((indices, _, buildPileIndex) => {
    if (canPlayCard(card, buildPileIndex, gameState)) {
      indices.push(buildPileIndex);
    }
    return indices;
  }, []);

export const countVisibleNaturalCards = (
  gameState: GameState,
  targetValue: number
): number => {
  let visibleCards = 0;

  gameState.buildPiles.forEach((pile) => {
    pile.forEach((card) => {
      if (!card.isSkipBo && card.value === targetValue) {
        visibleCards++;
      }
    });
  });

  gameState.players.forEach((player) => {
    player.discardPiles.forEach((pile) => {
      pile.forEach((card) => {
        if (!card.isSkipBo && card.value === targetValue) {
          visibleCards++;
        }
      });
    });

    player.hand.forEach((card) => {
      if (card && !card.isSkipBo && card.value === targetValue) {
        visibleCards++;
      }
    });

    player.stockPile.forEach((card) => {
      if (!card.isSkipBo && card.value === targetValue) {
        visibleCards++;
      }
    });
  });

  return visibleCards;
};

export const countVisibleSkipBos = (gameState: GameState): number => {
  let visibleSkipBos = 0;

  gameState.buildPiles.forEach((pile) => {
    pile.forEach((card) => {
      if (card.isSkipBo) {
        visibleSkipBos++;
      }
    });
  });

  gameState.players.forEach((player) => {
    player.discardPiles.forEach((pile) => {
      pile.forEach((card) => {
        if (card.isSkipBo) {
          visibleSkipBos++;
        }
      });
    });

    player.hand.forEach((card) => {
      if (card?.isSkipBo) {
        visibleSkipBos++;
      }
    });
  });

  return visibleSkipBos;
};

export const getClosestGapToStock = (
  gameState: GameState,
  playerIndex: number = gameState.currentPlayerIndex
): number | null => {
  const stockCard = getTopStockCard(getAIPlayer(gameState, playerIndex));

  if (!stockCard || stockCard.isSkipBo) {
    return 0;
  }

  let bestGap = Number.POSITIVE_INFINITY;

  gameState.buildPiles.forEach((pile) => {
    const nextValue = getNextBuildValue(pile);
    if (nextValue <= stockCard.value) {
      bestGap = Math.min(bestGap, stockCard.value - nextValue);
    }
  });

  return Number.isFinite(bestGap) ? bestGap : null;
};

export const getAccessibleSkipBoCount = (player: Player): number => {
  let count = 0;

  player.hand.forEach((card) => {
    if (card?.isSkipBo) {
      count++;
    }
  });

  player.discardPiles.forEach((pile) => {
    if (pile[pile.length - 1]?.isSkipBo) {
      count++;
    }
  });

  if (getTopStockCard(player)?.isSkipBo) {
    count++;
  }

  return count;
};
