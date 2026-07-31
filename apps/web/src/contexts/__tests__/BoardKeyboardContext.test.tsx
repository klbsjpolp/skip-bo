import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialGameState, type Card, type GameState, type MoveResult } from '@skipbo/game-core';

import { BoardKeyboardProvider } from '@/contexts/BoardKeyboardContext';
import { CardAnimationProvider } from '@/contexts/CardAnimationContext';
import { useBoardKeyboard } from '@/contexts/useBoardKeyboard';
import { ACTIVITY_REVEAL_MS, AUTO_REVEAL_DELAY_MS, AUTO_REVEAL_MS, markKeyHintsSeenThisSession } from '@/game/keyHints';

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

/** A board on the local player's turn, with a known hand and empty piles. */
const createGameState = (overrides: Partial<GameState> = {}): GameState => {
  const state = initialGameState();
  state.currentPlayerIndex = 0;
  state.buildPiles = [[], [], [], []];
  state.selectedCard = null;
  state.players[0].stockPile = [card(11), card(12)];
  state.players[0].hand = [card(1), card(4), card(5), card(6), card(7)];
  state.players[0].discardPiles = [[], [], [], []];
  return { ...state, ...overrides };
};

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

const hintsAreVisible = () => document.body.getAttribute('data-key-hints') === 'visible';

beforeEach(() => {
  handlers = createHandlers();
  sessionStorage.clear();
  // A desktop pointer, so the unprompted reveal is allowed to fire.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.removeAttribute('data-key-hints');
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

  it('opens the cheat sheet on ?, listing every binding', () => {
    mount(createGameState());

    fireEvent.keyDown(window, { code: 'Slash', key: '?' });

    const sheet = screen.getByTestId('keyboard-shortcuts-dialog');
    // 4 build + 1 talon + 5 hand + 4 discard, plus Space, Enter, Escape and Alt.
    expect(sheet.querySelectorAll('kbd')).toHaveLength(18);
    expect(screen.getByText('Raccourcis clavier')).toBeTruthy();
  });

  it('does not act on the board while the cheat sheet is open', () => {
    mount(createGameState());

    fireEvent.keyDown(window, { code: 'Slash', key: '?' });
    pressOnWindow('KeyW');

    expect(handlers.selectCard).not.toHaveBeenCalled();
  });
});

describe('BoardKeyboardProvider — hint reveal', () => {
  it('reveals the badges unprompted on the first settled turn, then hides them', () => {
    vi.useFakeTimers();
    mount(createGameState());

    expect(hintsAreVisible()).toBe(false);

    // A short delay lets the first interactive frame settle before fading in.
    act(() => void vi.advanceTimersByTime(AUTO_REVEAL_DELAY_MS));
    expect(hintsAreVisible()).toBe(true);

    act(() => void vi.advanceTimersByTime(AUTO_REVEAL_MS));
    expect(hintsAreVisible()).toBe(false);
  });

  it('fires the unprompted reveal only once per session', () => {
    markKeyHintsSeenThisSession();
    vi.useFakeTimers();
    mount(createGameState());

    act(() => void vi.advanceTimersByTime(AUTO_REVEAL_DELAY_MS + AUTO_REVEAL_MS));

    expect(hintsAreVisible()).toBe(false);
  });

  it('leaves the badges down on a touch-primary device', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    vi.useFakeTimers();
    mount(createGameState());

    act(() => void vi.advanceTimersByTime(AUTO_REVEAL_DELAY_MS));

    expect(hintsAreVisible()).toBe(false);
  });

  it('waits for the local turn before revealing', () => {
    vi.useFakeTimers();
    mount(createGameState({ currentPlayerIndex: 1 }));

    act(() => void vi.advanceTimersByTime(AUTO_REVEAL_DELAY_MS));

    expect(hintsAreVisible()).toBe(false);
  });

  it('brings the badges back on any key press, then hides them again when idle', () => {
    markKeyHintsSeenThisSession();
    vi.useFakeTimers();
    mount(createGameState());

    // An unbound key still counts — pressing one is exactly the signal that the
    // player wants the keyboard and does not know the map.
    act(() => pressOnWindow('KeyK'));
    expect(hintsAreVisible()).toBe(true);

    act(() => void vi.advanceTimersByTime(ACTIVITY_REVEAL_MS));
    expect(hintsAreVisible()).toBe(false);
  });

  it('holds the badges up for as long as Alt is down, without acting on the board', () => {
    markKeyHintsSeenThisSession();
    mount(createGameState());

    act(() => void fireEvent.keyDown(window, { code: 'AltLeft', key: 'Alt' }));
    expect(hintsAreVisible()).toBe(true);
    expect(handlers.selectCard).not.toHaveBeenCalled();

    // Releasing some other key mid-hold must not drop the badges.
    act(() => void fireEvent.keyUp(window, { code: 'KeyW', key: 'w' }));
    expect(hintsAreVisible()).toBe(true);

    act(() => void fireEvent.keyUp(window, { code: 'AltLeft', key: 'Alt' }));
    expect(hintsAreVisible()).toBe(false);
  });

  it('releases the Alt hold when the window loses focus', () => {
    // Alt-Tabbing away never delivers the keyup, which would otherwise strand
    // the badges on until the next Alt press.
    markKeyHintsSeenThisSession();
    mount(createGameState());

    act(() => void fireEvent.keyDown(window, { code: 'AltLeft', key: 'Alt' }));
    expect(hintsAreVisible()).toBe(true);

    act(() => void fireEvent.blur(window));
    expect(hintsAreVisible()).toBe(false);
  });

  it('keeps the badges down entirely while disabled', () => {
    vi.useFakeTimers();
    mount(createGameState(), false);

    act(() => void vi.advanceTimersByTime(AUTO_REVEAL_DELAY_MS));
    act(() => void fireEvent.keyDown(window, { code: 'AltLeft', key: 'Alt' }));

    expect(hintsAreVisible()).toBe(false);
  });
});
