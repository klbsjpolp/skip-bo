import type { Card, GameConfig } from '../types/index.js';
import { shuffle } from '../lib/shuffle.js';

export const createCard = (value: number, isSkipBo: boolean): Card => ({
  value,
  isSkipBo,
});

export const createDeck = (config: GameConfig): Card[] => {
  const deck: Card[] = [];

  // Skip-Bo
  for (let i = 0; i < config.SKIP_BO_CARDS; i++) deck.push(createCard(config.CARD_VALUES_SKIP_BO, true));

  // 12 × (1-12)
  for (let v = config.CARD_VALUES_MIN; v <= config.CARD_VALUES_MAX; v++)
    for (let i = 0; i < 12; i++) deck.push(createCard(v, false));

  return shuffle(deck);
};
