import type { Card, GameConfig, GameState, Player, SelectedCard } from '@/types';
import { MESSAGES } from '@/lib/config';

export const uiFixtureNames = [
  'ready-human',
  'selected-hand',
  'ai-turn',
  'victory-human',
] as const;

export type UiFixtureName = typeof uiFixtureNames[number];

const FIXTURE_CONFIG: GameConfig = {
  DECK_SIZE: 162,
  SKIP_BO_CARDS: 18,
  HAND_SIZE: 5,
  STOCK_SIZE: 30,
  BUILD_PILES_COUNT: 4,
  DISCARD_PILES_COUNT: 4,
  CARD_VALUES_MIN: 1,
  CARD_VALUES_MAX: 12,
  CARD_VALUES_SKIP_BO: 0,
};

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const buildDeck = (count: number, offset = 0): Card[] =>
  Array.from({ length: count }, (_, index) => card(((index + offset) % 12) + 1));

const createPlayer = ({
  isAI,
  stockPile,
  hand,
  discardPiles,
}: {
  isAI: boolean;
  stockPile: Card[];
  hand: (Card | null)[];
  discardPiles: Card[][];
}): Player => ({
  isAI,
  stockPile,
  hand,
  discardPiles,
});

const createBaseState = (): GameState => ({
  deck: buildDeck(42, 2),
  buildPiles: [[], [card(1), card(2), card(3)], [card(1), card(2), card(3), card(4)], []],
  completedBuildPiles: [],
  players: [
    createPlayer({
      isAI: false,
      stockPile: [card(12), card(11), card(10), card(9), card(8), card(7)],
      hand: [card(1), card(5), card(7), card(9), card(12)],
      discardPiles: [[card(3)], [card(8)], [], [card(2), card(6)]],
    }),
    createPlayer({
      isAI: true,
      stockPile: [card(4), card(6), card(8), card(10), card(12)],
      hand: [card(2), card(4), card(6), card(8), card(10)],
      discardPiles: [[card(11)], [], [card(5)], []],
    }),
  ],
  currentPlayerIndex: 0,
  gameIsOver: false,
  winnerIndex: null,
  selectedCard: null,
  message: MESSAGES.SELECT_CARD,
  config: FIXTURE_CONFIG,
});

const createSelectedHandCard = (): SelectedCard => ({
  card: card(1),
  source: 'hand',
  index: 0,
});

const createReadyHumanFixture = (): GameState => ({
  ...createBaseState(),
  message: MESSAGES.SELECT_CARD,
});

const createSelectedHandFixture = (): GameState => {
  const state = createBaseState();
  state.players[0].hand = [createSelectedHandCard().card, card(5), card(7), card(9), card(12)];
  state.buildPiles = [[], [], [card(1), card(2), card(3), card(4)], []];
  state.selectedCard = createSelectedHandCard();
  state.message = MESSAGES.SELECT_DESTINATION;
  return state;
};

const createAiTurnFixture = (): GameState => ({
  ...createBaseState(),
  currentPlayerIndex: 1,
  message: "L'IA joue",
});

const createVictoryHumanFixture = (): GameState => {
  const state = createBaseState();
  state.players[0].stockPile = [];
  state.gameIsOver = true;
  state.winnerIndex = 0;
  state.message = MESSAGES.GAME_WON.replace('{player}', 'le joueur');
  return state;
};

const fixtureFactories: Record<UiFixtureName, () => GameState> = {
  'ready-human': createReadyHumanFixture,
  'selected-hand': createSelectedHandFixture,
  'ai-turn': createAiTurnFixture,
  'victory-human': createVictoryHumanFixture,
};

export const getRequestedUiFixtureName = (): UiFixtureName | null => {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return null;
  }

  const fixture = new URLSearchParams(window.location.search).get('fixture');
  return uiFixtureNames.find((name) => name === fixture) ?? null;
};

export const getUiFixture = (fixtureName: UiFixtureName): GameState => fixtureFactories[fixtureName]();
