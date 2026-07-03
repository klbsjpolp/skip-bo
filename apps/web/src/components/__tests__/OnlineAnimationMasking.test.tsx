import { noopAnimationDriver } from '@/services/animationDriver';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CenterArea } from '@/components/CenterArea';
import { PlayerArea } from '@/components/PlayerArea';
import type { AnimationContextType, CardAnimationData } from '@/contexts/CardAnimationContext';
import { CardAnimationContext } from '@/contexts/useCardAnimation';
import type { Card, GameConfig, GameState, Player } from '@skipbo/game-core';

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
  message: { code: 'SELECT_CARD' },
  config: FIXTURE_CONFIG,
});

const createAnimationContext = (activeAnimations: CardAnimationData[] = []): AnimationContextType => ({
  activeAnimations,
  startAnimation: vi.fn(),
  removeAnimation: vi.fn(),
  markAnimationStarted: vi.fn(),
  isCardBeingAnimated: vi.fn(() => false),
  waitForAnimations: vi.fn(async () => undefined),
  driver: noopAnimationDriver,
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

const createSettledIncomingBuildAnimation = (buildPileIndex: number, targetPileLength?: number): CardAnimationData => ({
  ...createIncomingBuildAnimation(buildPileIndex),
  id: `settled-build-${buildPileIndex}`,
  card: card(8),
  targetSettledInState: true,
  targetPileLength,
});

const createSettledIncomingDiscardAnimation = (
  playerIndex: number,
  discardPileIndex: number,
  targetPileLength?: number,
): CardAnimationData => ({
  ...createIncomingDiscardAnimation(playerIndex, discardPileIndex),
  id: `settled-discard-${playerIndex}-${discardPileIndex}`,
  card: card(8),
  targetSettledInState: true,
  targetPileLength,
});

const createIncomingDiscardAnimation = (playerIndex: number, discardPileIndex: number): CardAnimationData => ({
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

const createStockAnimationContext = (playerIndex: number, stockIndex: number): AnimationContextType => ({
  activeAnimations: [],
  startAnimation: vi.fn(),
  removeAnimation: vi.fn(),
  markAnimationStarted: vi.fn(),
  isCardBeingAnimated: vi.fn(
    (candidatePlayerIndex, source, index) =>
      candidatePlayerIndex === playerIndex && source === 'stock' && index === stockIndex,
  ),
  waitForAnimations: vi.fn(async () => undefined),
  driver: noopAnimationDriver,
});

describe('Online animation masking', () => {
  test('shows the previous build pile top card when an incoming online play is already present in state', () => {
    const gameState = createGameState();
    gameState.buildPiles[0] = [card(6), card(7), card(8)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createSettledIncomingBuildAnimation(0, 3)])}>
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

  test('does not hide the current build pile top before the settled online play reaches rendered state', () => {
    const gameState = createGameState();
    gameState.buildPiles[0] = [card(6), card(0, true)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createSettledIncomingBuildAnimation(0, 3)])}>
        <CenterArea
          gameState={gameState}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          canPlayCard={vi.fn(() => false)}
        />
      </CardAnimationContext.Provider>,
    );

    const buildPile = screen.getByLabelText('Pile de construction 1');

    expect(buildPile.querySelector('.card[data-value="2"]')).not.toBeNull();
    expect(buildPile.querySelector('.card[data-value="1"]')).toBeNull();
  });

  test('shows the previous discard pile top card when an incoming online discard is already present in state', () => {
    const gameState = createGameState();
    gameState.players[1].discardPiles[0] = [card(3), card(7), card(8)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createSettledIncomingDiscardAnimation(1, 0, 3)])}>
        <PlayerArea
          player={gameState.players[1]}
          playerIndex={1}
          isCurrentPlayer={false}
          isWinner={false}
          gameState={gameState}
          selectCard={vi.fn()}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const discardPile = screen.getByLabelText('Défausse 1');
    const visibleCardValues = Array.from(discardPile.querySelectorAll<HTMLElement>('.card[data-value]')).map(
      (element) => element.dataset.value,
    );

    expect(visibleCardValues).toEqual(['3', '7']);
  });

  test('does not hide the current discard pile top before the settled online discard reaches rendered state', () => {
    const gameState = createGameState();
    gameState.players[1].discardPiles[0] = [card(3), card(7)];

    render(
      <CardAnimationContext.Provider value={createAnimationContext([createSettledIncomingDiscardAnimation(1, 0, 3)])}>
        <PlayerArea
          player={gameState.players[1]}
          playerIndex={1}
          isCurrentPlayer={false}
          isWinner={false}
          gameState={gameState}
          selectCard={vi.fn()}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const discardPile = screen.getByLabelText('Défausse 1');
    const visibleCardValues = Array.from(discardPile.querySelectorAll<HTMLElement>('.card[data-value]')).map(
      (element) => element.dataset.value,
    );

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
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const discardPile = screen.getByLabelText('Défausse 1');
    const visibleCardValues = Array.from(discardPile.querySelectorAll<HTMLElement>('.card[data-value]')).map(
      (element) => element.dataset.value,
    );

    expect(visibleCardValues).toEqual(['3', '7']);
  });

  test('keeps the pre-completion "11" backdrop on the build pile while a completing play animation is still in flight', () => {
    // Scenario: opponent just played a 12 that completes build pile 0. Both
    // the play animation AND the staggered completion animations are
    // registered synchronously by the snapshot handler. The play card is
    // still mid-flight. The build pile must keep showing the "11" backdrop
    // until the play animation lands — switching to the "12" backdrop while
    // the carrying card is still flying makes the value appear at the
    // destination prematurely (user-reported bug).
    const gameState = createGameState();
    gameState.buildPiles[0] = [];
    gameState.completedBuildPiles = Array.from({ length: 12 }, (_, index) => card(index + 1));

    const playAnimation: CardAnimationData = {
      ...createSettledIncomingBuildAnimation(0, 0),
      card: card(12),
    };

    const completeAnimations: CardAnimationData[] = Array.from({ length: 12 }, (_, index) => ({
      id: `complete-${index}`,
      card: card(index + 1),
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 200, y: 200 },
      animationType: 'complete',
      sourceRevealed: true,
      targetRevealed: true,
      initialDelay: 300 + index * 100, // baseDelay = play duration, then staggered
      duration: 400,
      sourceInfo: {
        playerIndex: 1,
        source: 'build',
        index: 0,
      },
    }));

    render(
      <CardAnimationContext.Provider value={createAnimationContext([playAnimation, ...completeAnimations])}>
        <CenterArea
          gameState={gameState}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          canPlayCard={vi.fn(() => false)}
        />
      </CardAnimationContext.Provider>,
    );

    const buildPile = screen.getByLabelText('Pile de construction 1');

    // Build pile shows the "11" backdrop, NOT the "12" backdrop.
    expect(buildPile.querySelector('.card[data-value="11"]')).not.toBeNull();
    expect(buildPile.querySelector('.card[data-value="12"]')).toBeNull();
    expect(buildPile.querySelector('.empty-card')).toBeNull();
  });

  test('switches the build pile to the "12" backdrop once the play animation has landed', () => {
    // After the play animation finishes, AnimatedCard calls removeAnimation
    // and the play entry is gone — only the staggered "complete" animations
    // remain. At that point the build pile should show the "12" backdrop
    // while the cards retreat.
    const gameState = createGameState();
    gameState.buildPiles[0] = [];
    gameState.completedBuildPiles = Array.from({ length: 12 }, (_, index) => card(index + 1));

    const completeAnimations: CardAnimationData[] = Array.from({ length: 12 }, (_, index) => ({
      id: `complete-${index}`,
      card: card(index + 1),
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 200, y: 200 },
      animationType: 'complete',
      sourceRevealed: true,
      targetRevealed: true,
      initialDelay: index * 100,
      duration: 400,
      sourceInfo: {
        playerIndex: 1,
        source: 'build',
        index: 0,
      },
    }));

    render(
      <CardAnimationContext.Provider value={createAnimationContext(completeAnimations)}>
        <CenterArea
          gameState={gameState}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          canPlayCard={vi.fn(() => false)}
        />
      </CardAnimationContext.Provider>,
    );

    const buildPile = screen.getByLabelText('Pile de construction 1');

    expect(buildPile.querySelector('.card[data-value="12"]')).not.toBeNull();
    expect(buildPile.querySelector('.card[data-value="11"]')).toBeNull();
  });

  test('does not leak previously-completed retreat cards while play + completion animations are active', () => {
    // pendingCompletionPlayCount must not double-count when 'complete'
    // animations are already registered for the same pile. Otherwise the
    // retreat pile would hide one extra card from the existing stack while
    // the new completion sequence runs.
    const gameState = createGameState();
    gameState.buildPiles[0] = [];
    // 5 previously-completed cards + 12 newly completed (last one is the 12).
    const previouslyCompleted = [card(5), card(6), card(7), card(8), card(9)];
    const newlyCompleted = Array.from({ length: 12 }, (_, index) => card(index + 1));
    gameState.completedBuildPiles = [...previouslyCompleted, ...newlyCompleted];

    const playAnimation: CardAnimationData = {
      ...createSettledIncomingBuildAnimation(0, 0),
      card: card(12),
    };
    const completeAnimations: CardAnimationData[] = newlyCompleted.map((cardData, index) => ({
      id: `complete-${index}`,
      card: cardData,
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 200, y: 200 },
      animationType: 'complete',
      sourceRevealed: true,
      targetRevealed: true,
      initialDelay: 300 + index * 100,
      duration: 400,
      sourceInfo: { playerIndex: 1, source: 'build', index: 0 },
    }));

    render(
      <CardAnimationContext.Provider value={createAnimationContext([playAnimation, ...completeAnimations])}>
        <CenterArea
          gameState={gameState}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          canPlayCard={vi.fn(() => false)}
        />
      </CardAnimationContext.Provider>,
    );

    const retreatPile = screen.getByTestId('retreat-pile');
    const visibleValues = Array.from(retreatPile.querySelectorAll<HTMLElement>('.card[data-value]')).map(
      (element) => element.dataset.value,
    );

    // All 5 previously-completed cards (or up to RETREAT_PILE_PREVIEW_LIMIT
    // of them) must remain visible. None of the 12 newly-retreated cards
    // should be on screen yet — they're still on the build pile waiting to
    // fly away.
    expect(visibleValues).toContain('9');
    // The newly-completed cards have values 1..12; the 5 previously-completed
    // ones are 5..9. We assert no card with value 10, 11 or 12 leaks through.
    expect(visibleValues).not.toContain('10');
    expect(visibleValues).not.toContain('11');
    expect(visibleValues).not.toContain('12');
  });

  test('hides the just-completed 12 on the retreat pile while the play animation is still in flight', () => {
    // Scenario: an opponent just played a 12 that completed build pile 0.
    // The snapshot has landed (commitView already happened), so:
    //   - buildPiles[0] is empty (cleared by completion)
    //   - completedBuildPiles contains the 12 cards (including the 12 on top)
    // But triggerCompletedBuildPileAnimation hasn't scheduled its complete
    // animations yet (microtask gap after triggerAIAnimation resolves), so
    // activeAnimations only contains the in-flight play animation.
    // Without masking, the retreat pile would briefly render the 12 before
    // the play animation visually delivers it.
    const gameState = createGameState();
    gameState.buildPiles[0] = [];
    gameState.completedBuildPiles = [
      card(1),
      card(2),
      card(3),
      card(4),
      card(5),
      card(6),
      card(7),
      card(8),
      card(9),
      card(10),
      card(11),
      card(12),
    ];

    const playAnimationLandingOnCompletedPile = {
      ...createSettledIncomingBuildAnimation(0, 0),
      card: card(12),
    };

    render(
      <CardAnimationContext.Provider value={createAnimationContext([playAnimationLandingOnCompletedPile])}>
        <CenterArea
          gameState={gameState}
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          canPlayCard={vi.fn(() => false)}
        />
      </CardAnimationContext.Provider>,
    );

    const retreatPile = screen.getByTestId('retreat-pile');

    expect(retreatPile.querySelector('.card[data-value="12"]')).toBeNull();
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
          playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
          clearSelection={vi.fn()}
        />
      </CardAnimationContext.Provider>,
    );

    const stockPile = container.querySelector('.stock-pile');

    expect(stockPile?.querySelector('.back')).not.toBeNull();
  });
});
