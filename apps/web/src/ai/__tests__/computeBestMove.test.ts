import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeBestMove } from '@/ai/computeBestMove';
import { canPlayCard } from '@/lib/validators';
import { gameReducer } from '@/state/gameReducer';
import { initialGameState } from '@/state/initialGameState';
import type { GameState } from '@/types';

const runAIMove = async (gameState: GameState) => {
  const movePromise = computeBestMove(gameState);
  await vi.runAllTimersAsync();
  return movePromise;
};

const runAITurn = async (gameState: GameState, maxSteps: number = 8): Promise<GameState> => {
  let nextState = gameState;

  for (let step = 0; step < maxSteps; step++) {
    const action = await runAIMove(nextState);
    nextState = gameReducer(nextState, action);

    if (action.type === 'END_TURN') {
      return nextState;
    }
  }

  return nextState;
};

describe('computeBestMove', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('privilégie une séquence qui débloque la pile stock', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.deck = [];
    state.completedBuildPiles = [];
    state.selectedCard = null;
    state.buildPiles = [
      [
        { value: 1, isSkipBo: false },
        { value: 2, isSkipBo: false },
      ],
      [],
      [],
      [],
    ];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 5, isSkipBo: false }],
      hand: [
        { value: 3, isSkipBo: false },
        { value: 1, isSkipBo: false },
        null,
        null,
        null,
      ],
      discardPiles: [[{ value: 4, isSkipBo: false }], [], [], []],
    };

    const move = await runAIMove(state);

    expect(move).toMatchObject({
      type: 'SELECT_CARD',
      source: 'hand',
      index: 0,
      plannedBuildPileIndex: 0,
    });
  });

  it('évite de jouer un Skip-Bo si une carte naturelle suffit', async () => {
    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.deck = [];
    state.completedBuildPiles = [];
    state.selectedCard = null;
    state.buildPiles = [[], [], [], []];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 9, isSkipBo: false }],
      hand: [
        { value: 0, isSkipBo: true },
        { value: 1, isSkipBo: false },
        null,
        null,
        null,
      ],
      discardPiles: [[], [], [], []],
    };

    const move = await runAIMove(state);

    expect(move).toMatchObject({
      type: 'SELECT_CARD',
      source: 'hand',
      index: 1,
    });
  });

  it('respecte la pile centrale planifiée pour une carte déjà sélectionnée', async () => {
    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.selectedCard = {
      card: { value: 0, isSkipBo: true },
      source: 'hand',
      index: 0,
      plannedBuildPileIndex: 2,
    };
    state.buildPiles = [
      [],
      [{ value: 1, isSkipBo: false }],
      Array.from({ length: 11 }, (_, index) => ({ value: index + 1, isSkipBo: false })),
      [],
    ];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      hand: [{ value: 0, isSkipBo: true }, null, null, null, null],
    };

    const move = await runAIMove(state);

    expect(move).toEqual({ type: 'PLAY_CARD', buildPile: 2 });
  });

  it('respecte la défausse planifiée pour une carte de main déjà sélectionnée', async () => {
    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.selectedCard = {
      card: { value: 10, isSkipBo: false },
      source: 'hand',
      index: 0,
      plannedDiscardPileIndex: 3,
    };
    state.buildPiles = [[], [], [], []];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      hand: [{ value: 10, isSkipBo: false }, null, null, null, null],
      discardPiles: [[], [], [], []],
    };

    const move = await runAIMove(state);

    expect(move).toEqual({ type: 'DISCARD_CARD', discardPile: 3 });
  });

  it('peut varier le choix de pile centrale quand plusieurs options se valent presque', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.deck = [];
    state.completedBuildPiles = [];
    state.selectedCard = null;
    state.buildPiles = [[], [], [], []];
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 1, isSkipBo: false }],
      hand: [null, null, null, null, null],
      discardPiles: [[], [], [], []],
    };

    const move = await runAIMove(state);

    expect(move).toMatchObject({
      type: 'SELECT_CARD',
      source: 'stock',
      plannedBuildPileIndex: 3,
    });
  });

  it('évite de débloquer la pile stock humaine quand une défausse neutre suffit', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.deck = [];
    state.completedBuildPiles = [];
    state.selectedCard = null;
    state.buildPiles = [
      Array.from({ length: 7 }, (_, index) => ({ value: index + 1, isSkipBo: false })),
      [],
      [],
      [],
    ];
    state.players[0] = {
      ...state.players[0],
      stockPile: [{ value: 9, isSkipBo: false }],
      discardPiles: [[{ value: 10, isSkipBo: false }], [], [], []],
    };
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 12, isSkipBo: false }],
      hand: [{ value: 8, isSkipBo: false }, null, null, null, null],
      discardPiles: [[], [], [], []],
    };

    const move = await runAIMove(state);

    expect(move).toMatchObject({
      type: 'SELECT_CARD',
      source: 'hand',
      index: 0,
      plannedDiscardPileIndex: 0,
    });
  });

  it('termine son tour sans laisser une carte stock humaine jouable quand il peut la consommer', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.deck = [];
    state.completedBuildPiles = [];
    state.selectedCard = null;
    state.buildPiles = [
      Array.from({ length: 8 }, (_, index) => ({ value: index + 1, isSkipBo: false })),
      [],
      [],
      [],
    ];
    state.players[0] = {
      ...state.players[0],
      stockPile: [{ value: 9, isSkipBo: false }],
    };
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 12, isSkipBo: false }],
      hand: [
        { value: 1, isSkipBo: false },
        { value: 9, isSkipBo: false },
        null,
        null,
        null,
      ],
      discardPiles: [[], [], [], []],
    };

    const finalState = await runAITurn(state);
    const humanStockCard = finalState.players[0].stockPile[finalState.players[0].stockPile.length - 1];

    expect(humanStockCard).toBeTruthy();
    expect(
      finalState.buildPiles.some((_, buildPileIndex) =>
        humanStockCard ? canPlayCard(humanStockCard, buildPileIndex, finalState) : false
      )
    ).toBe(false);
  });

  it('peut lancer une séquence qui rebloque immédiatement la pile stock humaine', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = initialGameState();

    state.currentPlayerIndex = 1;
    state.deck = [];
    state.completedBuildPiles = [];
    state.selectedCard = null;
    state.buildPiles = [
      Array.from({ length: 7 }, (_, index) => ({ value: index + 1, isSkipBo: false })),
      [],
      [],
      [],
    ];
    state.players[0] = {
      ...state.players[0],
      stockPile: [{ value: 9, isSkipBo: false }],
    };
    state.players[1] = {
      ...state.players[1],
      isAI: true,
      stockPile: [{ value: 12, isSkipBo: false }],
      hand: [
        { value: 8, isSkipBo: false },
        { value: 9, isSkipBo: false },
        null,
        null,
        null,
      ],
      discardPiles: [[], [], [], []],
    };

    const move = await runAIMove(state);

    expect(move).toMatchObject({
      type: 'SELECT_CARD',
      source: 'hand',
      index: 0,
      plannedBuildPileIndex: 0,
    });
  });
});
