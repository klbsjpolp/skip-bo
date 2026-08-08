import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Card, GameState, MoveResult } from '@skipbo/game-core';
import { canPlayCard } from '@skipbo/game-core';
import { useDrag, type DragSource, type DragTargetId } from '@/contexts/useDrag';
import { createEdgeAutoScroller } from '@/game/dragAutoScroll';
import {
  dragProbePoints,
  dragThresholdFor,
  dropToleranceFor,
  ghostLiftFor,
  readCardHeightPx,
  resolveDropTarget,
} from '@/game/dragTargeting';
import { canDiscardFromSource } from '@/game/pileIntents';
import { setDragCommitOverride } from '@/services/dragCommitOverride';

/**
 * Only one card is ever in the air. iPadOS happily delivers a `pointerdown`
 * for a second finger landing on another card, and two concurrent drags would
 * then fight over the same `selectedCard` — the second one wins the selection
 * and the first one commits it to the wrong pile.
 */
let gestureInFlight = false;

interface UseDraggableCardOptions {
  source: DragSource;
  card: Card | null;
  enabled: boolean;
  gameState: GameState;
  selectCard: (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => void;
  playCard: (buildPileIndex: number) => Promise<MoveResult>;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
  isInteractionBlocked?: () => boolean;
}

const computeValidTargets = (card: Card, source: DragSource, gameState: GameState) => {
  const validBuildPiles = new Set<number>();
  for (let i = 0; i < gameState.buildPiles.length; i++) {
    if (canPlayCard(card, i, gameState)) validBuildPiles.add(i);
  }
  const validDiscardPiles = new Set<number>();
  // Same rule the click and keyboard paths resolve through — a discard pile
  // accepts a hand card and nothing else.
  if (canDiscardFromSource(source.kind)) {
    for (let i = 0; i < gameState.config.DISCARD_PILES_COUNT; i++) {
      validDiscardPiles.add(i);
    }
  }
  return { validBuildPiles, validDiscardPiles };
};

export interface DraggableCardBindings {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  'data-drag-source': string;
  'data-drag-source-index': string;
  'data-drag-source-discard-index'?: string;
}

export function useDraggableCard(options: UseDraggableCardOptions): DraggableCardBindings {
  const { source, card, enabled, gameState, selectCard, playCard, discardCard, isInteractionBlocked } = options;
  const { beginDrag, updateDrag, endDrag } = useDrag();
  // Track whether the most recent pointerdown produced a drag. We use this to
  // suppress the click event that would otherwise trigger after pointerup and
  // toggle the click-flow selection back off.
  const wasDraggingRef = useRef(false);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !card) return;
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      // A second finger, or a second card grabbed while one is already flying.
      if (gestureInFlight) return;
      if (isInteractionBlocked?.()) return;

      // Stop the browser from starting a native text-selection drag from the card.
      if (event.pointerType === 'mouse') {
        event.preventDefault();
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      const pointerType = event.pointerType || 'mouse';
      const isTouch = pointerType === 'touch';
      const dragThreshold = dragThresholdFor(pointerType);
      const dropTolerance = dropToleranceFor(pointerType);
      const ghostLift = ghostLiftFor(pointerType, readCardHeightPx());
      const targetEl = event.currentTarget;
      let started = false;
      let validBuild: Set<number> = new Set();
      let validDiscard: Set<number> = new Set();
      let lastX = startX;
      let lastY = startY;
      gestureInFlight = true;
      wasDraggingRef.current = false;

      // Selection is deferred until the drag actually begins (movement crosses
      // the threshold). This way a plain tap falls straight through to the
      // legacy click-flow handlers — e.g. tapping a discard pile while a hand
      // card is selected discards the hand card to that pile, which is the
      // intended click affordance. Only a real drag swaps the selection.

      const resolveTarget = (x: number, y: number): DragTargetId | null =>
        resolveDropTarget(dragProbePoints(x, y, ghostLift), validBuild, validDiscard, dropTolerance);

      try {
        targetEl.setPointerCapture(pointerId);
      } catch {
        /* safari/iOS sometimes throws on capture; fall back to document listeners */
      }

      // `touch-action: none` on the card is supposed to hand us the whole
      // gesture, and on iPadOS it often doesn't: Safari re-evaluates the
      // gesture a few frames in and gives it to the page scroller instead,
      // which fires `pointercancel` and kills the drag mid-flight — the "it
      // starts and then the page scrolls" failure. Cancelling the touch stream
      // outright is the only thing that reliably keeps the drag alive. It is
      // scoped to this one gesture, so touches that start anywhere else still
      // scroll and pinch normally.
      const blockTouchScroll = (touchEvent: TouchEvent) => {
        if (touchEvent.cancelable) touchEvent.preventDefault();
      };
      if (isTouch) {
        document.addEventListener('touchmove', blockTouchScroll, { passive: false });
      }

      // The page cannot be panned by hand during a drag (see above), so a
      // pile scrolled off-screen is only reachable by holding the card near
      // the edge and letting the board come to it.
      const autoScroller = createEdgeAutoScroller(() => {
        if (!started) return;
        updateDrag({ x: lastX, y: lastY }, resolveTarget(lastX, lastY));
      });

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        const dx = lastX - startX;
        const dy = lastY - startY;
        if (!started) {
          if (Math.hypot(dx, dy) < dragThreshold) return;
          // Now we know it's a real drag — select the source so a mid-air release
          // leaves the card in the .selected state and lets the click flow
          // finish the move.
          selectCard(source.kind, source.index, source.kind === 'discard' ? source.discardPileIndex : undefined);
          const sets = computeValidTargets(card, source, gameState);
          validBuild = sets.validBuildPiles;
          validDiscard = sets.validDiscardPiles;
          beginDrag({
            source,
            card,
            validBuildPiles: validBuild,
            validDiscardPiles: validDiscard,
            pointer: { x: lastX, y: lastY },
            ghostOffsetY: -ghostLift,
            hovered: null,
          });
          started = true;
          wasDraggingRef.current = true;
        }
        updateDrag({ x: lastX, y: lastY }, resolveTarget(lastX, lastY));
        autoScroller.update(lastY);
      };

      const cleanup = () => {
        gestureInFlight = false;
        autoScroller.stop();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('blur', onWindowBlur);
        document.removeEventListener('touchmove', blockTouchScroll);
        try {
          targetEl.releasePointerCapture(pointerId);
        } catch {
          /* no-op */
        }
      };

      const swallowNextClick = () => {
        const swallow = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        // Fallback in case no click event follows (e.g. touch + scroll cancel).
        window.setTimeout(() => {
          // Guard against jsdom teardown where `window` is gone before the timer fires.
          if (typeof window === 'undefined') return;
          window.removeEventListener('click', swallow, { capture: true });
        }, 50);
      };

      function onUp(upEvent: PointerEvent) {
        if (upEvent.pointerId !== pointerId) return;
        cleanup();
        if (!started) {
          endDrag();
          return;
        }
        const hovered = resolveTarget(upEvent.clientX, upEvent.clientY);
        endDrag();
        swallowNextClick();
        if (!hovered) return;
        // Start the play/discard animation from where the ghost was released
        // rather than from the source DOM position — which on touch is the
        // lifted card, not the fingertip.
        setDragCommitOverride({
          startPosition: { x: upEvent.clientX, y: upEvent.clientY - ghostLift },
        });
        if (hovered.kind === 'build') {
          void playCard(hovered.index);
        } else if (hovered.kind === 'discard') {
          void discardCard(hovered.index);
        }
      }

      // iOS still cancels the odd gesture (a system edge swipe, a call
      // banner). The source stays selected, so the move is one tap on the
      // destination away rather than lost.
      function abortGesture() {
        cleanup();
        if (started) swallowNextClick();
        endDrag();
      }

      function onCancel(cancelEvent: PointerEvent) {
        if (cancelEvent.pointerId !== pointerId) return;
        abortGesture();
      }

      // Backgrounding the app mid-drag — an app switch, Control Center, a
      // notification — can end the pointer stream without ever delivering an
      // up or a cancel. Nothing would then release the single-drag guard or
      // the `touchmove` block, and the board would come back inert.
      function onWindowBlur() {
        abortGesture();
      }

      function onKey(keyEvent: KeyboardEvent) {
        if (keyEvent.key !== 'Escape') return;
        abortGesture();
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey);
      window.addEventListener('blur', onWindowBlur);
    },
    [
      enabled,
      card,
      source,
      gameState,
      selectCard,
      playCard,
      discardCard,
      isInteractionBlocked,
      beginDrag,
      updateDrag,
      endDrag,
    ],
  );

  return {
    onPointerDown,
    'data-drag-source': source.kind,
    'data-drag-source-index': String(source.index),
    ...(source.kind === 'discard' ? { 'data-drag-source-discard-index': String(source.discardPileIndex) } : {}),
  };
}
