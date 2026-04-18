import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { CenterArea } from '@/components/CenterArea';
import type {
  AnimationContextType,
  CardAnimationData,
} from '@/contexts/CardAnimationContext';
import { CardAnimationContext } from '@/contexts/useCardAnimation.ts';
import type { Card, GameConfig, GameState, Player } from '@/types';

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

const createPlayer = (isAI: boolean): Player => ({
  isAI,
  stockPile: [],
  hand: [null, null, null, null, null],
  discardPiles: [[], [], [], []],
});

const createGameState = (completedBuildPiles: Card[]): GameState => ({
  deck: [],
  buildPiles: [[], [], [], []],
  completedBuildPiles,
  players: [createPlayer(false), createPlayer(true)],
  currentPlayerIndex: 0,
  gameIsOver: false,
  winnerIndex: null,
  selectedCard: null,
  message: '',
  config: FIXTURE_CONFIG,
});

const createAnimationContext = (
  activeAnimations: CardAnimationData[] = [],
): AnimationContextType => ({
  activeAnimations,
  startAnimation: vi.fn(),
  removeAnimation: vi.fn(),
  markAnimationStarted: vi.fn(),
  isCardBeingAnimated: vi.fn(() => false),
  waitForAnimations: vi.fn(async () => undefined),
});

const createCompletionAnimations = (count: number): CardAnimationData[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `complete-${index}`,
    card: card(index + 1),
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 100, y: 100 },
    animationType: 'complete',
    sourceRevealed: true,
    targetRevealed: true,
    initialDelay: index * 50,
    duration: 300,
    sourceInfo: {
      playerIndex: 0,
      source: 'build',
      index: 0,
    },
  }));

const createIncomingBuildAnimation = (buildPileIndex: number): CardAnimationData => ({
  id: `play-build-${buildPileIndex}`,
  card: card(5),
  startPosition: { x: 0, y: 0 },
  endPosition: { x: 100, y: 100 },
  animationType: 'play',
  sourceRevealed: true,
  targetRevealed: true,
  initialDelay: 0,
  duration: 300,
  sourceInfo: {
    playerIndex: 0,
    source: 'hand',
    index: 0,
  },
  targetInfo: {
    playerIndex: 0,
    source: 'build',
    index: buildPileIndex,
  },
});

const createSettledIncomingBuildAnimation = (buildPileIndex: number): CardAnimationData => ({
  ...createIncomingBuildAnimation(buildPileIndex),
  id: `settled-build-${buildPileIndex}`,
  targetSettledInState: true,
});

const renderCenterArea = (
  gameState: GameState,
  activeAnimations: CardAnimationData[] = [],
) =>
  render(
    <CardAnimationContext.Provider value={createAnimationContext(activeAnimations)}>
      <CenterArea
        gameState={gameState}
        playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
        canPlayCard={vi.fn(() => false)}
      />
    </CardAnimationContext.Provider>,
  );

describe('CenterArea', () => {
  test('hides newly completed cards from the retreat preview while completion animation is active', () => {
    const gameState = createGameState(
      Array.from({ length: 12 }, (_, index) => card(index + 1)),
    );

    renderCenterArea(gameState, createCompletionAnimations(12));

    const retreatPile = screen.getByTestId('retreat-pile');

    expect(screen.getByTestId('retreat-pile-title').textContent).toContain('Retrait (12)');
    expect(retreatPile.querySelectorAll('.retreat-card-shell')).toHaveLength(0);
    expect(retreatPile.querySelector('.empty-card')).not.toBeNull();
  });

  test('keeps previously settled retreat cards visible while a new completion animation is active', () => {
    const alreadySettledCards = [card(2), card(5), card(7), card(9)];
    const gameState = createGameState([
      ...alreadySettledCards,
      ...Array.from({ length: 12 }, (_, index) => card(index + 1)),
    ]);

    renderCenterArea(gameState, createCompletionAnimations(12));

    const retreatCards = Array.from(
      screen
        .getByTestId('retreat-pile')
        .querySelectorAll<HTMLElement>('.retreat-card-shell .card[data-value]'),
    ).map((element) => Number(element.dataset.value));

    expect(retreatCards).toEqual([5, 7, 9]);
  });

  test('keeps the current top build card visible while an incoming play animation is active', () => {
    const gameState = createGameState([]);
    gameState.buildPiles[0] = [card(1), card(2), card(3), card(4)];

    const { container } = renderCenterArea(gameState, [createIncomingBuildAnimation(0)]);
    const buildPile = container.querySelector<HTMLElement>('[data-build-pile="0"]');

    expect(buildPile?.querySelector('.card[data-value="4"]')).not.toBeNull();
    expect(buildPile?.querySelector('.card[data-value="3"]')).toBeNull();
  });

  test('shows the previous top build card when the incoming online card is already present in state', () => {
    const gameState = createGameState([]);
    gameState.buildPiles[0] = [card(1), card(2), card(3), card(4), card(5)];

    const { container } = renderCenterArea(gameState, [createSettledIncomingBuildAnimation(0)]);
    const buildPile = container.querySelector<HTMLElement>('[data-build-pile="0"]');

    expect(buildPile?.querySelector('.card[data-value="4"]')).not.toBeNull();
    expect(buildPile?.querySelector('.card[data-value="5"]')).toBeNull();
  });
});
