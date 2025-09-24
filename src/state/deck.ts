import {Card, GameConfig} from '@/types';

export const createCard = (value: number, isSkipBo: boolean): Card => ({
  value,
  isSkipBo,
});

export const shuffle = <T>(array: T[]): T[] => {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const createDeck = (config: GameConfig): Card[] => {
  const deck: Card[] = [];

  // Skip-Bo
  for (let i = 0; i < config.SKIP_BO_CARDS; i++) deck.push(createCard(config.CARD_VALUES_SKIP_BO, true));

  // 12 × (1-12)
  for (let v = config.CARD_VALUES_MIN; v <= config.CARD_VALUES_MAX; v++)
    for (let i = 0; i < 12; i++) deck.push(createCard(v, false));

  return shuffle(deck);
};