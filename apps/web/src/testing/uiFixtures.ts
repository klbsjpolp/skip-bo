import type { Card, GameConfig, GameState, Player, SelectedCard } from '@skipbo/game-core';
import type { GameStatsMode, GameStatsRecord } from '@/monitoring/gameStats';
import { MESSAGES } from '@skipbo/game-core';

export const uiFixtureNames = [
  'ready-human',
  'selected-hand',
  'ai-turn',
  'retreat-filled',
  'victory-human',
  'one-of-each',
] as const;

export type UiFixtureName = (typeof uiFixtureNames)[number];

const FIXTURE_CONFIG: GameConfig = {
  DECK_SIZE: 162,
  SKIP_BO_CARDS: 18,
  CARD_COPIES_PER_RANK: 12,
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
      hand: [card(1), card(5), card(7), card(0, true), card(12)],
      discardPiles: [[card(3), card(0, true)], [card(8)], [], [card(2), card(0, true), card(6)]],
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
  state.players[0].hand = [createSelectedHandCard().card, card(5), card(0, true), card(9), card(12)];
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

const createRetreatFilledFixture = (): GameState => ({
  ...createBaseState(),
  completedBuildPiles: [card(2), card(5), card(7, true), card(9), card(11)],
  message: MESSAGES.SELECT_CARD,
});

const createVictoryHumanFixture = (): GameState => {
  const state = createBaseState();
  state.players[0].stockPile = [];
  state.gameIsOver = true;
  state.winnerIndex = 0;
  state.message = MESSAGES.GAME_WON.replace('{player}', 'le joueur');
  return state;
};

const createOneOfEachFixture = (): GameState => {
  const state = createBaseState();
  state.buildPiles = [[card(1)], [card(1), card(2)], [card(1), card(2), card(3)], [card(1), card(2), card(3), card(4)]];
  state.completedBuildPiles = [card(0, true)];
  state.players[0].hand = [card(5), card(6), card(7), card(8), card(0, true)];
  state.players[0].discardPiles = [
    [card(1), card(5), card(9)],
    [card(2), card(6), card(10)],
    [card(3), card(7), card(11)],
    [card(4), card(8), card(12)],
  ];
  state.players[1].discardPiles = [
    [card(1), card(2), card(3)],
    [card(4), card(5), card(6)],
    [card(7), card(8), card(9)],
    [card(10), card(11), card(12)],
  ];

  return state;
};

const fixtureFactories: Record<UiFixtureName, () => GameState> = {
  'ready-human': createReadyHumanFixture,
  'selected-hand': createSelectedHandFixture,
  'ai-turn': createAiTurnFixture,
  'retreat-filled': createRetreatFilledFixture,
  'victory-human': createVictoryHumanFixture,
  'one-of-each': createOneOfEachFixture,
};

export const getRequestedUiFixtureName = (): UiFixtureName | null => {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return null;
  }

  const fixture = new URLSearchParams(window.location.search).get('fixture');
  return uiFixtureNames.find((name) => name === fixture) ?? null;
};

export const getUiFixture = (fixtureName: UiFixtureName): GameState => fixtureFactories[fixtureName]();

// Deterministic finished-game record for the stats-dialog visual baseline.
// Fixed timestamps/durations keep the screenshot stable; the start time is also
// timezone-pinned by the spec since it is rendered with the local locale. The
// header differs by mode (online shows the player count + version), so the mode
// is parameterized to cover both variants. Online play is human-vs-human, so the
// opponent is a named human rather than the AI used locally.
const STATS_DIALOG_FIXTURE_START = '2026-06-25T14:03:00.000Z';

export const getStatsDialogFixtureRecord = (mode: GameStatsMode = 'local'): GameStatsRecord => {
  const isOnline = mode === 'online';
  return {
    id: 'fixture-game',
    schemaVersion: 1,
    appVersion: 'v1.0.0',
    mode,
    startedAt: STATS_DIALOG_FIXTURE_START,
    endedAt: new Date(Date.parse(STATS_DIALOG_FIXTURE_START) + 510_000).toISOString(),
    durationMs: 510_000,
    totalTurns: 24,
    playerCount: 2,
    stockSize: 30,
    winnerIndex: 0,
    winnerName: isOnline ? 'Alice' : 'Joueur',
    winnerIsAI: false,
    players: [
      {
        index: 0,
        name: isOnline ? 'Alice' : 'Joueur',
        isAI: false,
        startStock: 30,
        leftoverStock: 0,
        cardsCleared: 30,
        turns: 12,
        playTimeMs: 270_000,
        isWinner: true,
      },
      {
        index: 1,
        name: isOnline ? 'Bob' : 'IA',
        isAI: !isOnline,
        startStock: 30,
        leftoverStock: 7,
        cardsCleared: 23,
        turns: 12,
        playTimeMs: 240_000,
        isWinner: false,
      },
    ],
  };
};

/** Reads the stats-dialog fixture mode from the URL (`?statsMode=online`). */
export const getRequestedStatsDialogMode = (): GameStatsMode => {
  if (typeof window === 'undefined') {
    return 'local';
  }
  return new URLSearchParams(window.location.search).get('statsMode') === 'online' ? 'online' : 'local';
};
