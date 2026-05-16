import { createContext, useContext } from 'react';
import type { Card } from '@/types';

export type DragSource =
  | { kind: 'hand'; index: number }
  | { kind: 'stock'; index: number }
  | { kind: 'discard'; index: number; discardPileIndex: number };

export type DragTargetId = { kind: 'build'; index: number } | { kind: 'discard'; index: number };

export interface DragSession {
  source: DragSource;
  card: Card;
  validBuildPiles: ReadonlySet<number>;
  validDiscardPiles: ReadonlySet<number>;
  pointer: { x: number; y: number };
  hovered: DragTargetId | null;
}

export interface DragContextValue {
  session: DragSession | null;
  beginDrag: (init: Omit<DragSession, 'hovered'> & { hovered?: DragTargetId | null }) => void;
  updateDrag: (pointer: { x: number; y: number }, hovered: DragTargetId | null) => void;
  endDrag: () => void;
}

// A no-op default keeps the hook usable in tests / fixtures that don't mount a
// DragProvider. The drag feature is purely UI sugar — failing closed (no drag,
// no highlights) is the right behavior when the provider is absent.
const NOOP_DRAG_CONTEXT: DragContextValue = {
  session: null,
  beginDrag: () => undefined,
  updateDrag: () => undefined,
  endDrag: () => undefined,
};

export const DragContext = createContext<DragContextValue>(NOOP_DRAG_CONTEXT);

export const useDrag = (): DragContextValue => useContext(DragContext);

const sourcesMatch = (a: DragSource, b: DragSource): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'discard' && b.kind === 'discard') {
    return a.index === b.index && a.discardPileIndex === b.discardPileIndex;
  }
  return a.index === b.index;
};

export const useIsDragSource = (source: DragSource): boolean => {
  const { session } = useDrag();
  return session !== null && sourcesMatch(session.source, source);
};
