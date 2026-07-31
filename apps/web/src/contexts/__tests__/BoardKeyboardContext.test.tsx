import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Card, GameConfig, GameState, MoveResult, Player } from '@skipbo/game-core';

import { BoardKeyboardProvider } from '@/contexts/BoardKeyboardContext';
import { CardAnimationProvider } from '@/contexts/CardAnimationContext';
import { useBoardKeyboard } from '@/contexts/useBoardKeyboard';

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

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  isAI: false,
  stockPile: [card(11), card(12)],
  hand: [card(1), card(4), card(5), card(6), card(7)],
  discardPiles: [[], [], [], []],
  ...overrides,
});

const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  deck: [],
  buildPiles: [[], [], [], []],
  completedBuildPiles: [],
  players: [createPlayer(), createPlayer({ isAI: true })],
  currentPlayerIndex: 0,
  gameIsOver: false,
  winnerIndex: null,
  selectedCard: null,
  message: { code: 'SELECT_CARD' },
  config: FIXTURE_CONFIG,
  ...overrides,
});

const createHandlers = () => ({
  selectCard: vi.fn() as unknown as (
    source: 'hand' | 'stock' | 'discard',
    index: number,
    discardPileIndex?: number,
  ) => void,
  playCard: vi.fn(async () => ({ success: true, message: 'ok' })) as unknown as (
    buildPileIndex: number,
  ) => Promise<MoveResult>,
  discardCard: vi.fn(async () => ({ success: true, message: 'ok' })) as unknown as (
    discardPileIndex: number,
  ) => Promise<MoveResult>,
  clearSelection: vi.fn() as unknown as () => void,
});

/** Surfaces the armed pile so tests can assert on it without a full board. */
function ArmedProbe() {
  const { armedDiscardPile } = useBoardKeyboard();
  return <span data-testid="armed">{armedDiscardPile === null ? 'none' : String(armedDiscardPile)}</span>;
}

let handlers = createHandlers();

/**
 * The provider reads the animation queue to decide when the board is settled
 * enough for the unprompted hint reveal, so it needs a CardAnimationProvider
 * above it — as it always has in the app (both are mounted under Root).
 */
const tree = (gameState: GameState, enabled: boolean, children: ReactNode) => (
  <CardAnimationProvider>
    <BoardKeyboardProvider
      enabled={enabled}
      gameState={gameState}
      selectCard={handlers.selectCard}
      playCard={handlers.playCard}
      discardCard={handlers.discardCard}
      clearSelection={handlers.clearSelection}
    >
      {children}
    </BoardKeyboardProvider>
  </CardAnimationProvider>
);

const mount = (gameState: GameState, enabled = true) => {
  handlers = createHandlers();

  return render(
    tree(
      gameState,
      enabled,
      <>
        <ArmedProbe />
        <input data-testid="text-field" />
        <button data-testid="a-button">bouton</button>
      </>,
    ),
  );
};

const pressOnWindow = (code: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(window, { code, key: '', ...init });

beforeEach(() => {
  handlers = createHandlers();
});

describe('BoardKeyboardProvider', () => {
  it('selects a hand card from its letter key', () => {
    mount(createGameState());

    pressOnWindow('KeyW');

    expect(handlers.selectCard).toHaveBeenCalledWith('hand', 0, undefined);
  });

  it('plays the selection onto a build pile from its digit key', () => {
    mount(createGameState({ selectedCard: { card: card(1), source: 'hand', index: 0 } }));

    pressOnWindow('Digit2');

    expect(handlers.playCard).toHaveBeenCalledWith(0);
  });

  it('arms a discard without committing it, then commits on Space', () => {
    mount(createGameState({ selectedCard: { card: card(4), source: 'hand', index: 1 } }));

    pressOnWindow('KeyO');

    expect(handlers.discardCard).not.toHaveBeenCalled();
    expect(screen.getByTestId('armed').textContent).toBe('2');

    pressOnWindow('Space');

    expect(handlers.discardCard).toHaveBeenCalledWith(2);
    expect(screen.getByTestId('armed').textContent).toBe('none');
  });

  it('disarms on Escape without discarding or clearing the selection', () => {
    mount(createGameState({ selectedCard: { card: card(4), source: 'hand', index: 1 } }));

    pressOnWindow('KeyO');
    pressOnWindow('Escape');

    expect(screen.getByTestId('armed').textContent).toBe('none');
    expect(handlers.discardCard).not.toHaveBeenCalled();
    expect(handlers.clearSelection).not.toHaveBeenCalled();
  });

  it('clears the selection on a second Escape', () => {
    mount(createGameState({ selectedCard: { card: card(4), source: 'hand', index: 1 } }));

    pressOnWindow('Escape');

    expect(handlers.clearSelection).toHaveBeenCalled();
  });

  it('drops a stale arm when the selection changes underneath it', () => {
    const { rerender } = mount(createGameState({ selectedCard: { card: card(4), source: 'hand', index: 1 } }));

    pressOnWindow('KeyO');
    expect(screen.getByTestId('armed').textContent).toBe('2');

    // The player reaches for the mouse and picks up their stock card instead.
    rerender(
      tree(createGameState({ selectedCard: { card: card(12), source: 'stock', index: 1 } }), true, <ArmedProbe />),
    );

    expect(screen.getByTestId('armed').textContent).toBe('none');
  });

  it('ignores keys typed into a text field', () => {
    mount(createGameState());

    fireEvent.keyDown(screen.getByTestId('text-field'), { code: 'KeyW', key: 'w' });

    expect(handlers.selectCard).not.toHaveBeenCalled();
  });

  it('leaves Space to a focused button but still claims letters', () => {
    mount(createGameState());
    const button = screen.getByTestId('a-button');

    fireEvent.keyDown(button, { code: 'Space', key: ' ' });
    expect(handlers.discardCard).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { code: 'KeyW', key: 'w' });
    expect(handlers.selectCard).toHaveBeenCalledWith('hand', 0, undefined);
  });

  it('ignores modified presses so browser shortcuts survive', () => {
    mount(createGameState());

    pressOnWindow('Digit2', { metaKey: true });
    pressOnWindow('KeyW', { ctrlKey: true });

    expect(handlers.playCard).not.toHaveBeenCalled();
    expect(handlers.selectCard).not.toHaveBeenCalled();
  });

  it('does nothing at all while disabled', () => {
    mount(createGameState(), false);

    pressOnWindow('KeyW');

    expect(handlers.selectCard).not.toHaveBeenCalled();
  });

  it('unbinds the listener on unmount', () => {
    const { unmount } = mount(createGameState());

    unmount();
    pressOnWindow('KeyW');

    expect(handlers.selectCard).not.toHaveBeenCalled();
  });
});
