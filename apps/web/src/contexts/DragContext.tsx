import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { DRAG_ACTIVE_ATTRIBUTE, DragContext, type DragContextValue, type DragSession } from '@/contexts/useDrag';

interface DragProviderProps {
  children: ReactNode;
}

export const DragProvider: FC<DragProviderProps> = ({ children }) => {
  const [session, setSession] = useState<DragSession | null>(null);

  const beginDrag = useCallback<DragContextValue['beginDrag']>((init) => {
    setSession({
      source: init.source,
      card: init.card,
      validBuildPiles: init.validBuildPiles,
      validDiscardPiles: init.validDiscardPiles,
      pointer: init.pointer,
      ghostOffsetY: init.ghostOffsetY,
      hovered: init.hovered ?? null,
    });
  }, []);

  const updateDrag = useCallback<DragContextValue['updateDrag']>((pointer, hovered) => {
    setSession((prev) => (prev ? { ...prev, pointer, hovered } : prev));
  }, []);

  const endDrag = useCallback(() => {
    setSession(null);
  }, []);

  // Toggle a body data-attribute so CSS can light up valid drop targets globally
  // while a drag is active.
  useEffect(() => {
    if (session) {
      document.body.setAttribute(DRAG_ACTIVE_ATTRIBUTE, 'true');
      return () => document.body.removeAttribute(DRAG_ACTIVE_ATTRIBUTE);
    }
    return undefined;
  }, [session]);

  const value = useMemo<DragContextValue>(
    () => ({ session, beginDrag, updateDrag, endDrag }),
    [session, beginDrag, updateDrag, endDrag],
  );

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};
