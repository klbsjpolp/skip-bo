import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Card, GameState, MoveResult } from '@/types';
import { canPlayCard } from '@/lib/validators';
import { useDrag, type DragSource, type DragTargetId } from '@/contexts/useDrag';
import { setDragCommitOverride } from '@/services/dragCommitOverride';

const DRAG_THRESHOLD_PX = 5;

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
  if (source.kind === 'hand' && !card.isSkipBo) {
    for (let i = 0; i < gameState.config.DISCARD_PILES_COUNT; i++) {
      validDiscardPiles.add(i);
    }
  }
  return { validBuildPiles, validDiscardPiles };
};

const hitTest = (
  x: number,
  y: number,
  validBuild: ReadonlySet<number>,
  validDiscard: ReadonlySet<number>,
): DragTargetId | null => {
  // Guard: jsdom-based unit tests don't implement elementFromPoint.
  if (typeof document.elementFromPoint !== 'function') return null;
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const target = (el as HTMLElement).closest<HTMLElement>('[data-drop-target]');
  if (!target) return null;
  const kind = target.getAttribute('data-drop-target');
  const idxAttr = target.getAttribute('data-drop-index');
  if (idxAttr === null) return null;
  const index = Number.parseInt(idxAttr, 10);
  if (Number.isNaN(index)) return null;
  if (kind === 'build' && validBuild.has(index)) return { kind: 'build', index };
  if (kind === 'discard' && validDiscard.has(index)) return { kind: 'discard', index };
  return null;
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
      if (isInteractionBlocked?.()) return;

      // Stop the browser from starting a native text-selection drag from the card.
      if (event.pointerType === 'mouse') {
        event.preventDefault();
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      const targetEl = event.currentTarget;
      let started = false;
      let validBuild: Set<number> = new Set();
      let validDiscard: Set<number> = new Set();
      wasDraggingRef.current = false;

      // Selection is deferred until the drag actually begins (movement crosses
      // the threshold). This way a plain tap falls straight through to the
      // legacy click-flow handlers — e.g. tapping a discard pile while a hand
      // card is selected discards the hand card to that pile, which is the
      // intended click affordance. Only a real drag swaps the selection.

      try {
        targetEl.setPointerCapture(pointerId);
      } catch {
        /* safari/iOS sometimes throws on capture; fall back to document listeners */
      }

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!started) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
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
            pointer: { x: moveEvent.clientX, y: moveEvent.clientY },
            hovered: null,
          });
          started = true;
          wasDraggingRef.current = true;
        }
        const hovered = hitTest(moveEvent.clientX, moveEvent.clientY, validBuild, validDiscard);
        updateDrag({ x: moveEvent.clientX, y: moveEvent.clientY }, hovered);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey);
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
        const hovered = hitTest(upEvent.clientX, upEvent.clientY, validBuild, validDiscard);
        endDrag();
        swallowNextClick();
        if (!hovered) return;
        // Start the play/discard animation from where the user dropped the
        // ghost rather than from the source DOM position.
        setDragCommitOverride({
          startPosition: { x: upEvent.clientX, y: upEvent.clientY },
        });
        if (hovered.kind === 'build') {
          void playCard(hovered.index);
        } else if (hovered.kind === 'discard') {
          void discardCard(hovered.index);
        }
      }

      function onCancel(cancelEvent: PointerEvent) {
        if (cancelEvent.pointerId !== pointerId) return;
        cleanup();
        if (started) swallowNextClick();
        endDrag();
      }

      function onKey(keyEvent: KeyboardEvent) {
        if (keyEvent.key !== 'Escape') return;
        cleanup();
        if (started) swallowNextClick();
        endDrag();
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey);
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
