import { Card } from '@/types';
import { CONFIG, CARD_VALUES } from '@/lib/config';

export const createCard = (value: number): Card => ({
  value,
  isSkipBo: value === CARD_VALUES.SKIP_BO,
});

export const shuffle = <T>(array: T[]): T[] => {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];

  // Skip-Bo
  for (let i = 0; i < CONFIG.SKIP_BO_CARDS; i++) deck.push(createCard(CARD_VALUES.SKIP_BO));

  // 12 × (1-12)
  for (let v = CARD_VALUES.MIN; v <= CARD_VALUES.MAX; v++)
    for (let i = 0; i < 12; i++) deck.push(createCard(v));

  return shuffle(deck);
};