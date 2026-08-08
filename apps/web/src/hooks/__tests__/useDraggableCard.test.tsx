import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { DragGhost } from '@/components/DragGhost';
import { DragProvider } from '@/contexts/DragContext';
import { useDrag } from '@/contexts/useDrag';
import { useDraggableCard } from '@/hooks/useDraggableCard';
import type { Card, GameConfig, GameState, MoveResult, Player } from '@skipbo/game-core';

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

const HAND_CARD: Card = { value: 1, isSkipBo: false };

const createPlayer = (isAI: boolean): Player => ({
  isAI,
  stockPile: [{ value: 11, isSkipBo: false }],
  hand: [HAND_CARD, null, null, null, null],
  discardPiles: [[], [], [], []],
});

const GAME_STATE: GameState = {
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
};

// jsdom neither lays out nor scrolls, so the harness owns both: the build
// pile's document position and the page's scroll offset are plain variables,
// and its viewport rect is derived from the two.
const VIEWPORT_HEIGHT = 768;
let scrollY = 0;
let buildPileTop = 100;

const buildPileRect = (): DOMRect => {
  const top = buildPileTop - scrollY;
  return { left: 100, right: 170, width: 70, height: 100, top, bottom: top + 100, x: 100, y: top } as DOMRect;
};

beforeAll(() => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VIEWPORT_HEIGHT });
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  window.scrollBy = ((_x: number, y: number) => {
    scrollY += y;
  }) as typeof window.scrollBy;
});

beforeEach(() => {
  scrollY = 0;
  buildPileTop = 100;
});

const createHandlers = () => ({
  selectCard: vi.fn(),
  playCard: vi.fn(async (): Promise<MoveResult> => ({ success: true, message: 'ok' })),
  discardCard: vi.fn(async (): Promise<MoveResult> => ({ success: true, message: 'ok' })),
});

type Handlers = ReturnType<typeof createHandlers>;

/** Surfaces the live hover so tests can watch it change without a pointer event. */
function HoverProbe() {
  const { session } = useDrag();
  const hovered = session?.hovered;
  return <div data-testid="hovered">{hovered ? `${hovered.kind}-${hovered.index}` : 'none'}</div>;
}

function Harness({ handlers }: { handlers: Handlers }) {
  const bindings = useDraggableCard({
    source: { kind: 'hand', index: 0 },
    card: HAND_CARD,
    enabled: true,
    gameState: GAME_STATE,
    selectCard: handlers.selectCard,
    playCard: handlers.playCard,
    discardCard: handlers.discardCard,
  });
  return (
    <>
      <div data-testid="hand-card" {...bindings} />
      <div data-testid="second-card" {...bindings} />
      <div data-testid="build-pile" data-drop-target="build" data-drop-index="0" />
      <div data-testid="discard-pile" data-drop-target="discard" data-drop-index="2" />
      <HoverProbe />
      <DragGhost />
    </>
  );
}

const renderHarness = () => {
  const handlers = createHandlers();
  render(
    <DragProvider>
      <Harness handlers={handlers} />
    </DragProvider>,
  );
  screen.getByTestId('build-pile').getBoundingClientRect = buildPileRect;
  screen.getByTestId('discard-pile').getBoundingClientRect = () =>
    ({ left: 300, right: 370, width: 70, height: 100, top: 100, bottom: 200, x: 300, y: 100 }) as DOMRect;
  return handlers;
};

const pointerDown = (testId: string, init: PointerEventInit) =>
  act(() => {
    fireEvent.pointerDown(screen.getByTestId(testId), { button: 0, ...init });
  });

const windowPointerEvent = (type: 'pointermove' | 'pointerup' | 'pointercancel', init: PointerEventInit) =>
  act(() => {
    fireEvent(window, new PointerEvent(type, { bubbles: true, ...init }));
  });

/**
 * Every test must end the gesture it starts: the "one card in the air at a
 * time" guard is module state, so a leaked drag would block the next test.
 */
afterEach(() => {
  windowPointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  windowPointerEvent('pointercancel', { pointerId: 2, pointerType: 'touch' });
});

describe('useDraggableCard on touch', () => {
  test('a finger has to travel further than a cursor before the card lifts', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    // 6 px: past the 5 px cursor threshold, short of the 8 px touch one.
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 306, clientY: 300 });
    expect(handlers.selectCard).not.toHaveBeenCalled();
    expect(screen.queryByTestId('drag-ghost')).toBeNull();

    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 310, clientY: 300 });
    expect(handlers.selectCard).toHaveBeenCalledWith('hand', 0, undefined);
    expect(screen.getByTestId('drag-ghost')).toBeTruthy();
  });

  test('the whole touch gesture is taken away from the page scroller', () => {
    renderHarness();
    const beforeDrag = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(beforeDrag);
    expect(beforeDrag.defaultPrevented).toBe(false);

    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });

    // Blocked from the very first move, before the drag threshold is even
    // crossed — once Safari has begun a scroll it is too late to take it back.
    const duringGesture = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(duringGesture);
    expect(duringGesture.defaultPrevented).toBe(true);

    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });

    const afterGesture = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(afterGesture);
    expect(afterGesture.defaultPrevented).toBe(false);
  });

  test('a mouse gesture leaves page scrolling alone', () => {
    renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 300 });

    const duringGesture = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(duringGesture);
    expect(duringGesture.defaultPrevented).toBe(false);

    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 300 });
  });

  // The card rides the pointer with no offset, for a finger exactly as for a
  // cursor. A lifted ghost was tried and reverted: showing the card somewhere
  // other than where it would land made players aim below their target.
  test.each([['touch'], ['mouse']])('the card rides directly under a %s pointer', (pointerType) => {
    renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType, clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType, clientX: 300, clientY: 320 });

    expect(screen.getByTestId('drag-ghost').style.transform).toContain('translate3d(300px, 320px, 0)');

    windowPointerEvent('pointerup', { pointerId: 1, pointerType, clientX: 300, clientY: 320 });
  });

  test('a release that misses the pile by a few pixels still plays the card', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    // 12 px below the pile — inside the touch tolerance, outside the pile.
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 212 });
    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 212 });

    expect(handlers.playCard).toHaveBeenCalledWith(0);
  });

  test('a release over a discard pile discards rather than plays', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 335, clientY: 150 });
    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 335, clientY: 150 });

    expect(handlers.discardCard).toHaveBeenCalledWith(2);
    expect(handlers.playCard).not.toHaveBeenCalled();
  });

  test('Escape drops the card back without committing it', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 120 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 150 });
    expect(screen.getByTestId('hovered').textContent).toBe('build-0');

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(screen.queryByTestId('drag-ghost')).toBeNull();

    // Releasing after the escape must not still commit the move.
    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 150 });
    expect(handlers.playCard).not.toHaveBeenCalled();
  });

  test('a release nowhere near a pile leaves the card selected instead of played', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 600, clientY: 600 });
    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 600, clientY: 600 });

    expect(handlers.playCard).not.toHaveBeenCalled();
    // The drag flow already committed the selection, so the move is one tap on
    // the destination away rather than lost.
    expect(handlers.selectCard).toHaveBeenCalledWith('hand', 0, undefined);
  });

  test('a second finger cannot grab a second card mid-drag', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 320, clientY: 300 });
    handlers.selectCard.mockClear();

    pointerDown('second-card', { pointerId: 2, pointerType: 'touch', clientX: 500, clientY: 500 });
    windowPointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 540, clientY: 500 });

    // The second pointer never registered, so it can neither steal the
    // selection nor drop the first card on the pile under it.
    expect(handlers.selectCard).not.toHaveBeenCalled();

    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 320, clientY: 300 });
    // …and the first drag is still the one that owns the release.
    expect(handlers.playCard).not.toHaveBeenCalled();
  });

  test('backgrounding the app mid-drag releases the board instead of wedging it', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 320, clientY: 300 });

    // iOS can end a pointer stream without ever delivering an up or a cancel.
    act(() => {
      fireEvent.blur(window);
    });
    expect(screen.queryByTestId('drag-ghost')).toBeNull();

    // The single-drag guard and the touchmove block are both released, so the
    // board is usable again rather than inert until a reload.
    const afterBlur = new Event('touchmove', { bubbles: true, cancelable: true });
    document.dispatchEvent(afterBlur);
    expect(afterBlur.defaultPrevented).toBe(false);

    handlers.selectCard.mockClear();
    pointerDown('hand-card', { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 320, clientY: 300 });
    expect(handlers.selectCard).toHaveBeenCalledWith('hand', 0, undefined);
  });

  test('holding a card at the bottom edge brings an off-screen pile up to it', () => {
    vi.useFakeTimers();
    // Off-screen below the fold: out of reach of a stationary finger at y=760,
    // tolerance included.
    buildPileTop = 800;
    renderHarness();

    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 760 });
    expect(screen.getByTestId('hovered').textContent).toBe('none');

    // One frame of edge scroll, with the finger held perfectly still: the board
    // moves under it and the pile it now covers lights up.
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(scrollY).toBeGreaterThan(0);
    expect(screen.getByTestId('hovered').textContent).toBe('build-0');

    windowPointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 135, clientY: 760 });
    vi.useRealTimers();
  });

  test('a cancelled gesture releases the guard so the next drag works', () => {
    const handlers = renderHarness();
    pointerDown('hand-card', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 320, clientY: 300 });
    windowPointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch', clientX: 320, clientY: 300 });
    expect(screen.queryByTestId('drag-ghost')).toBeNull();
    handlers.selectCard.mockClear();

    pointerDown('hand-card', { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300 });
    windowPointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 320, clientY: 300 });
    expect(handlers.selectCard).toHaveBeenCalledWith('hand', 0, undefined);
  });
});
