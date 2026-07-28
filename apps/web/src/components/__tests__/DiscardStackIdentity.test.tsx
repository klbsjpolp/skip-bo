import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { PlayerArea } from '@/components/PlayerArea';
import { DragProvider } from '@/contexts/DragContext';
import { CardAnimationProvider } from '@/contexts/CardAnimationContext';
import type { Card, GameConfig, GameState, MoveResult, Player } from '@skipbo/game-core';

/**
 * The Metro theme collapses non-top discard cards with a `clip-path` wipe.
 * A CSS transition only runs on a node that survives the change, so every card
 * in a pile must keep its DOM node when it stops being (or becomes) the top
 * card. Rendering the top card through a different component than the rest
 * reuses one React key for two element types, which remounts the node and
 * silently kills the animation — on the human side only, since the AI never
 * renders a draggable top card.
 */

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

const createPlayer = (discardPiles: Card[][], overrides: Partial<Player> = {}): Player => ({
  isAI: false,
  stockPile: [card(11), card(12)],
  hand: [card(3), card(4), card(5), card(6), card(7)],
  discardPiles,
  ...overrides,
});

const createGameState = (discardPiles: Card[][]): GameState => ({
  deck: [],
  buildPiles: [[], [], [], []],
  completedBuildPiles: [],
  players: [createPlayer(discardPiles), createPlayer([[], [], [], []], { isAI: true })],
  currentPlayerIndex: 0,
  gameIsOver: false,
  winnerIndex: null,
  selectedCard: null,
  message: { code: 'SELECT_CARD' },
  config: FIXTURE_CONFIG,
});

const handlers = createHandlers();

const tree = (gameState: GameState) => (
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
  </CardAnimationProvider>
);

/** Both seats inside one DragProvider, so a drag session is visible to both. */
const bothPlayers = (gameState: GameState) => (
  <CardAnimationProvider>
    <DragProvider>
      {gameState.players.map((player, index) => (
        <PlayerArea
          key={index}
          player={player}
          playerIndex={index}
          isCurrentPlayer={index === gameState.currentPlayerIndex}
          isWinner={false}
          gameState={gameState}
          selectCard={handlers.selectCard}
          playCard={handlers.playCard}
          discardCard={handlers.discardCard}
          clearSelection={handlers.clearSelection}
        />
      ))}
    </DragProvider>
  </CardAnimationProvider>
);

const cardNode = (value: string) =>
  screen.getByLabelText('Défausse 1').querySelector<HTMLElement>(`.card[data-value="${value}"]`);

describe('Discard stack DOM identity', () => {
  test('a card keeps its node when a discard lands on top of it', () => {
    const { rerender } = render(tree(createGameState([[card(8), card(9)], [], [], []])));

    const before = cardNode('9');
    expect(before, 'the 9 should be the top card to begin with').toBeTruthy();

    // A 10 is discarded onto the pile — the 9 is now a collapsed, non-top card.
    rerender(tree(createGameState([[card(8), card(9), card(10)], [], [], []])));

    expect(cardNode('9'), 'the 9 must keep its DOM node or its collapse cannot animate').toBe(before);
  });

  test('a card keeps its node when the card above it is played', () => {
    const { rerender } = render(tree(createGameState([[card(8), card(9), card(10)], [], [], []])));

    const before = cardNode('9');
    expect(before).toBeTruthy();

    // The 10 is played off the pile — the 9 becomes the draggable top card.
    rerender(tree(createGameState([[card(8), card(9)], [], [], []])));

    expect(cardNode('9'), 'the 9 must keep its DOM node or its reveal cannot animate').toBe(before);
  });

  test('only the top card advertises drag-source bindings', () => {
    render(tree(createGameState([[card(8), card(9)], [], [], []])));

    expect(cardNode('9')?.hasAttribute('data-drag-source')).toBe(true);
    expect(cardNode('8')?.hasAttribute('data-drag-source')).toBe(false);
  });

  test("dragging a discard card does not hide the opponent's card at the same position", () => {
    // `DragSource` is {kind, index, discardPileIndex} with no player, so the
    // opponent's card in the same slot matches the drag session identically.
    // Both players hold two cards in pile 0 so the coordinates collide exactly.
    const pile: Card[][] = [[card(8), card(9)], [], [], []];
    const gameState = createGameState(pile);
    gameState.players[1] = createPlayer([[card(4), card(5)], [], [], []], { isAI: true });

    render(bothPlayers(gameState));

    const human = screen.getByTestId('human-player-area');
    const ai = screen.getByTestId('ai-player-area');
    const humanTop = within(human).getByLabelText('Défausse 1').querySelector<HTMLElement>('.card[data-value="9"]')!;
    const aiTwin = within(ai).getByLabelText('Défausse 1').querySelector<HTMLElement>('.card[data-value="5"]')!;

    act(() => {
      fireEvent.pointerDown(humanTop, { pointerId: 9, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
      fireEvent(
        window,
        new PointerEvent('pointermove', {
          pointerId: 9,
          pointerType: 'mouse',
          buttons: 1,
          clientX: 200,
          clientY: 100,
          bubbles: true,
        }),
      );
    });

    expect(humanTop.className, 'the dragged card hides behind its floating replica').toContain('is-drag-source');
    expect(aiTwin.className, "the opponent's card is not the one being dragged").not.toContain('is-drag-source');

    act(() => {
      fireEvent(
        window,
        new PointerEvent('pointerup', {
          pointerId: 9,
          pointerType: 'mouse',
          clientX: 200,
          clientY: 100,
          bubbles: true,
        }),
      );
      // Consume the swallow-click listener the drag hook installs on drag-end.
      fireEvent.click(window);
    });
  });
});
