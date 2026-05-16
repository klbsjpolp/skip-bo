import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { PlayerArea } from '@/components/PlayerArea';
import { DragProvider } from '@/contexts/DragContext';
import { CardAnimationProvider } from '@/contexts/CardAnimationContext';
import type { Card, GameConfig, GameState, MoveResult, Player, SelectedCard } from '@/types';

type SelectCardFn = (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
type PlayCardFn = (buildPileIndex: number) => Promise<MoveResult>;
type DiscardCardFn = (discardPileIndex: number) => Promise<MoveResult>;
type ClearSelectionFn = () => void;

interface MockHandlers {
  selectCard: ReturnType<typeof vi.fn> & SelectCardFn;
  playCard: PlayCardFn;
  discardCard: DiscardCardFn;
  clearSelection: ClearSelectionFn;
}

const createHandlers = (): MockHandlers => ({
  selectCard: vi.fn() as ReturnType<typeof vi.fn> & SelectCardFn,
  playCard: vi.fn(async () => ({ success: true, message: 'ok' })) as unknown as PlayCardFn,
  discardCard: vi.fn(async () => ({ success: true, message: 'ok' })) as unknown as DiscardCardFn,
  clearSelection: vi.fn() as unknown as ClearSelectionFn,
});

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

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  isAI: false,
  stockPile: [card(11), card(12)],
  hand: [card(3), card(4), card(5), card(6), card(7)],
  discardPiles: [[card(8), card(9)], [], [], []],
  ...overrides,
});

const createGameState = (selectedCard: SelectedCard | null): GameState => ({
  deck: [],
  buildPiles: [[], [], [], []],
  completedBuildPiles: [],
  players: [createPlayer(), createPlayer({ isAI: true })],
  currentPlayerIndex: 0,
  gameIsOver: false,
  winnerIndex: null,
  selectedCard,
  message: '',
  config: FIXTURE_CONFIG,
});

const renderHumanPlayer = (gameState: GameState, handlers: MockHandlers) =>
  render(
    <CardAnimationProvider>
      <DragProvider>
        <PlayerArea
          player={gameState.players[0]}
          playerIndex={0}
          isCurrentPlayer
          isWinner={false}
          gameState={gameState}
          selectCard={handlers.selectCard}
          playCard={handlers.playCard}
          discardCard={handlers.discardCard}
          clearSelection={handlers.clearSelection}
        />
      </DragProvider>
    </CardAnimationProvider>,
  );

describe('Drag selection', () => {
  test('starting a drag from a discard top while a hand card is selected switches the selection to the discard source', () => {
    const handlers = createHandlers();
    // Hand card at index 0 is currently selected.
    const gameState = createGameState({
      card: card(3),
      source: 'hand',
      index: 0,
      discardPileIndex: undefined,
    });
    renderHumanPlayer(gameState, handlers);

    // Top of discard pile 0 (value 9). It's the rendered draggable top card.
    const discardPile = screen.getByLabelText('Défausse 1');
    const topCard = Array.from(discardPile.querySelectorAll<HTMLElement>('.card[data-value]')).pop();
    expect(topCard, 'expected a top discard card to drag').toBeTruthy();

    // Simulate a real drag: pointerdown then a pointermove past the 5px threshold.
    act(() => {
      fireEvent.pointerDown(topCard!, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      // Window-level pointermove triggers the drag's threshold check.
      fireEvent(
        window,
        new PointerEvent('pointermove', {
          pointerId: 1,
          pointerType: 'mouse',
          buttons: 1,
          clientX: 200,
          clientY: 100,
          bubbles: true,
        }),
      );
    });

    expect(handlers.selectCard).toHaveBeenCalled();
    // The drag handler must replace the prior hand selection with the discard
    // source — never leave it on `hand` and never call it for `stock`.
    const lastCall = handlers.selectCard.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('discard');
    expect(lastCall[2]).toBe(0); // discardPileIndex of pile 0

    // discardCard must NOT have been triggered as a side-effect (otherwise the
    // hand card would have been discarded instead of the drag starting).
    expect(handlers.discardCard as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();

    // Cleanup so the drag listeners (and the post-drop swallow-click capture
    // listener) don't leak between tests.
    act(() => {
      fireEvent(
        window,
        new PointerEvent('pointerup', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 200,
          clientY: 100,
          bubbles: true,
        }),
      );
      // Consume the swallow-click listener that the drag hook installs after
      // a successful drag-end so it doesn't eat the *next* test's click.
      fireEvent.click(window);
    });
  });

  test('a plain tap on a discard pile while a hand card is selected discards the hand card (legacy click flow)', () => {
    const handlers = createHandlers();
    const gameState = createGameState({
      card: card(3),
      source: 'hand',
      index: 0,
      discardPileIndex: undefined,
    });
    renderHumanPlayer(gameState, handlers);

    const discardPile = screen.getByLabelText('Défausse 1');
    const topCard = Array.from(discardPile.querySelectorAll<HTMLElement>('.card[data-value]')).pop()!;

    // Plain tap (pointerdown → pointerup with no movement → click). Drag must
    // NOT start, and the click must reach the discard-pile-stack's handler.
    act(() => {
      fireEvent.pointerDown(topCard, {
        pointerId: 3,
        pointerType: 'mouse',
        button: 0,
        clientX: 100,
        clientY: 100,
      });
    });
    act(() => {
      fireEvent(
        window,
        new PointerEvent('pointerup', {
          pointerId: 3,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      );
      // The trailing click is what the browser would dispatch after a tap.
      fireEvent.click(topCard);
    });

    // No selection switch — pointerdown without a real drag must be silent.
    expect(handlers.selectCard).not.toHaveBeenCalled();
    // The legacy click affordance fires: discard the selected hand card here.
    expect(handlers.discardCard as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(0);
  });

  test('starting a drag from a hand card while another hand card is selected switches the selection', () => {
    const handlers = createHandlers();
    const gameState = createGameState({
      card: card(3),
      source: 'hand',
      index: 0,
      discardPileIndex: undefined,
    });
    renderHumanPlayer(gameState, handlers);

    // Drag hand card index 2 (value 5).
    const otherHandSlot = document.querySelector('[data-card-index="2"] .card') as HTMLElement;
    expect(otherHandSlot).toBeTruthy();

    act(() => {
      fireEvent.pointerDown(otherHandSlot, {
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      fireEvent(
        window,
        new PointerEvent('pointermove', {
          pointerId: 2,
          pointerType: 'mouse',
          buttons: 1,
          clientX: 100,
          clientY: 200,
          bubbles: true,
        }),
      );
    });

    const lastCall = handlers.selectCard.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('hand');
    expect(lastCall[1]).toBe(2);

    act(() => {
      fireEvent(
        window,
        new PointerEvent('pointerup', {
          pointerId: 2,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 200,
          bubbles: true,
        }),
      );
    });
  });
});
