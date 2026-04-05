import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CenterArea } from '@/components/CenterArea';
import { PlayerArea } from '@/components/PlayerArea';
import type { AnimationContextType, CardAnimationData } from '@/contexts/CardAnimationContext';
import { CardAnimationContext } from '@/contexts/useCardAnimation';
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

const createGameState = (): GameState => ({
  deck: [],
  buildPiles: [[], [], [], []],
  completedBuildPiles: [],
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
  isCardBeingAnimated: vi.fn(() => false),
  waitForAnimations: vi.fn(async () => undefined),
});

const createIncomingBuildAnimation = (buildPileIndex: number): CardAnimationData => ({
  id: `build-${buildPileIndex}`,
  card: card(7),
  startPosition: { x: 0, y: 0 },
  endPosition: { x: 100, y: 100 },
  animationType: 'play',
  sourceRevealed: true,
  targetRevealed: true,
  initialDelay: 0,
  duration: 300,
  sourceInfo: {
    playerIndex: 1,
    source: 'hand',
    index: 0,
  },
  targetInfo: {
    playerIndex: 1,
    source: 'build',
    index: buildPileIndex,
  },
});

const createSettledIncomingBuildAnimation = (buildPileIndex: number): CardAnimationData => ({
  ...createIncomingBuildAnimation(buildPileIndex),
  id: `settled-build-${buildPileIndex}`,
  card: card(8),
  targetSettledInState: true,
});

const createSettledIncomingDiscardAnimation = (
  playerIndex: number,
  discardPileIndex: number,
): CardAnimationData => ({
  ...createIncomingDiscardAnimation(playerIndex, discardPileIndex),
  id: `settled-discard-${playerIndex}-${discardPileIndex}`,
  card: card(8),
  targetSettledInState: true,
});

const createIncomingDiscardAnimation = (
  playerIndex: number,
  discardPileIndex: number,
): CardAnimationData => ({
  id: `discard-${playerIndex}-${discardPileIndex}`,
  card: card(7),
  startPosition: { x: 0, y: 0 },
  endPosition: { x: 100, y: 100 },
  animationType: 'discard',
  sourceRevealed: true,
  targetRevealed: true,
  initialDelay: 0,
  duration: 300,
  sourceInfo: {
    playerIndex,
    source: 'hand',
    index: 0,
  },
  targetInfo: {
    playerIndex,
    source: 'discard',
    index: discardPileIndex,
    discardPileIndex,
  },
});

const createStockAnimationContext = (
  playerIndex: number,
  stockIndex: number,
): AnimationContextType => ({
  activeAnimations: [],
  startAnimation: vi.fn(),
  removeAnimation: vi.fn(),
  isCardBeingAnimated: vi.fn((candidatePlayerIndex, source, index) =>
    candidatePlayerIndex === playerIndex &&
    source === 'stock' &&
    index === stockIndex,
  ),
  waitForAnimations: vi.fn(async () => undefined),
});

describe('Online animation masking', () => {
  test('shows the previous build pile top card when an incoming online play is already present in state', () => {
    const gameState = createGameState();
    gameState.buildPiles[0] = [card(6), card(7), card(8)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createSettledIncomingBuildAnimation(0)])}>
        <CenterArea
          gameState={gameState}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          canPlayCard={vi.fn(() => false)}
        />
      </CardAnimationContext.Provider>,
    );

    const buildPile = screen.getByLabelText('Pile de construction 1');

    expect(buildPile.querySelector('.empty-card')).toBeNull();
    expect(buildPile.querySelector('.card[data-value="7"]')).not.toBeNull();
    expect(buildPile.querySelector('.card[data-value="8"]')).toBeNull();
  });

  test('shows the previous discard pile top card when an incoming online discard is already present in state', () => {
    const gameState = createGameState();
    gameState.players[1].discardPiles[0] = [card(3), card(7), card(8)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createSettledIncomingDiscardAnimation(1, 0)])}>
        <PlayerArea
          player={gameState.players[1]}
          playerIndex={1}
          isCurrentPlayer={false}
          isWinner={false}
          gameState={gameState}
          selectCard={vi.fn()}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const discardPile = screen.getByLabelText('Défausse 1');
    const visibleCardValues = Array.from(
      discardPile.querySelectorAll<HTMLElement>('.card[data-value]'),
    ).map((element) => element.dataset.value);

    expect(visibleCardValues).toEqual(['3', '7']);
  });

  test('keeps the current discard pile top card visible for the current player during a local discard animation', () => {
    const gameState = createGameState();
    gameState.players[0].discardPiles[0] = [card(3), card(7)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createIncomingDiscardAnimation(0, 0)])}>
        <PlayerArea
          player={gameState.players[0]}
          playerIndex={0}
          isCurrentPlayer={true}
          isWinner={false}
          gameState={gameState}
          selectCard={vi.fn()}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const discardPile = screen.getByLabelText('Défausse 1');
    const visibleCardValues = Array.from(
      discardPile.querySelectorAll<HTMLElement>('.card[data-value]'),
    ).map((element) => element.dataset.value);

    expect(visibleCardValues).toEqual(['3', '7']);
  });

  test('shows a face-down stock card instead of a revealed placeholder during stock animations', () => {
    const gameState = createGameState();
    gameState.players[0].stockPile = [card(0), card(7)];

    const { container } = render(
      <CardAnimationContext.Provider value={createStockAnimationContext(0, 1)}>
        <PlayerArea
          player={gameState.players[0]}
          playerIndex={0}
          isCurrentPlayer={true}
          isWinner={false}
          gameState={gameState}
          selectCard={vi.fn()}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const stockPile = container.querySelector('.stock-pile');

    expect(stockPile?.querySelector('.back')).not.toBeNull();
  });
});
