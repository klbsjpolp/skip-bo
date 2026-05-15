import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Card } from '@/components/Card';
import type { CardAnimationData } from '@/contexts/CardAnimationContext';
import { useCardAnimation } from '@/contexts/useCardAnimation';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  animation: CardAnimationData;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ animation }) => {
  const { removeAnimation, markAnimationStarted } = useCardAnimation();
  const rootRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);

  // For draw animations, portal into the destination hand-area so the in-flight
  // card shares its stacking context. Without this, .player-area's
  // `isolation: isolate` traps the global animation layer (z=1000) below the
  // hand cards' parent context, but the animated card still floats above
  // siblings in the same stacking trap — producing the visible z-snap when the
  // card lands and the real card mounts at its lower slot z-index.
  const portalTarget = useMemo<HTMLElement | null>(() => {
    if (animation.animationType !== 'draw') return null;
    return document.querySelector<HTMLElement>(
      `.player-area[data-player-index="${animation.sourceInfo.playerIndex}"] .hand-area.overlap-hand`
    );
  }, [animation.animationType, animation.sourceInfo.playerIndex]);
  // Card is invisible during the initial delay — same UX as before
  const [isVisible, setIsVisible] = useState(animation.initialDelay === 0);
  // For flip animations: tracks which face is currently showing
  const [isRevealed, setIsRevealed] = useState(animation.sourceRevealed);
  const needsFlip = animation.sourceRevealed !== animation.targetRevealed;
  // Tracks the second-half flip animation so the cleanup can cancel it
  const secondHalfRef = useRef<Animation | undefined>(undefined);

  // Effect 1: wait out the initial delay before showing the card
  useEffect(() => {
    if (animation.initialDelay === 0) return;
    const timeout = setTimeout(() => setIsVisible(true), animation.initialDelay);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation.id]);

  // Effect 2: start WAAPI once the card element is actually in the DOM.
  // useLayoutEffect fires synchronously after React commits the render, so
  // rootRef.current is guaranteed to be set here — even for delayed cards.
  useLayoutEffect(() => {
    if (!isVisible) return;

    markAnimationStarted(animation.id);

    const el = rootRef.current;
    if (!el) return;

    const style = getComputedStyle(el);
    const cardW = parseFloat(style.getPropertyValue('--card-width')) || 0;
    const cardH = parseFloat(style.getPropertyValue('--card-height')) || 0;
    const halfW = cardW / 2;
    const halfH = cardH / 2;

    const startAngle = animation.startAngleDeg ?? 0;
    const endAngle = animation.endAngleDeg ?? 0;
    // When portaled inside the hand-area (position: relative), the card's
    // absolute children are positioned relative to it — so subtract its
    // viewport offset so the same viewport coordinates resolve correctly.
    const offsetRect = portalTarget?.getBoundingClientRect();
    const offX = offsetRect?.left ?? 0;
    const offY = offsetRect?.top ?? 0;
    const sx = animation.startPosition.x - halfW - offX;
    const sy = animation.startPosition.y - halfH - offY;
    const ex = animation.endPosition.x - halfW - offX;
    const ey = animation.endPosition.y - halfH - offY;

    // Pin the card at startPosition before WAAPI fires so it's never at 0,0
    el.style.transform = `translate(${sx}px, ${sy}px) rotateZ(${startAngle}deg)`;

    const { duration } = animation;

    // Guard for environments without WAAPI (e.g. jsdom in unit tests)
    if (typeof el.animate !== 'function') {
      markAnimationStarted(animation.id);
      const fallback = setTimeout(() => removeAnimation(animation.id), duration);
      return () => clearTimeout(fallback);
    }

    // Main travel animation — no two-frame dance; WAAPI handles timing precisely
    const travelAnim = el.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) rotateZ(${startAngle}deg)` },
        { transform: `translate(${ex}px, ${ey}px) rotateZ(${endAngle}deg)` },
      ],
      { duration, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', fill: 'forwards' }
    );

    // Remove from context once travel completes — no setTimeout guess needed
    travelAnim.finished.then(() => removeAnimation(animation.id)).catch(() => {});

    // Flip animation: two-phase rotateY so the face-swap happens at 90°
    // (edge-on = invisible), avoiding any dependency on backface-visibility or
    // preserve-3d, both of which are broken by the filter: rule on .animation-*
    let firstHalfAnim: Animation | undefined;
    let flipCancelled = false;
    if (needsFlip && flipRef.current && duration > 0) {
      const flipDuration = duration * 0.4;
      const flipDelay  = duration * 0.3;

      firstHalfAnim = flipRef.current.animate(
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }],
        { duration: flipDuration / 2, delay: flipDelay, easing: 'ease-in', fill: 'forwards' }
      );

      firstHalfAnim.finished.then(() => {
        // Guard: cleanup may have run between firstHalf finishing and this callback
        if (flipCancelled) return;
        // Card is edge-on (invisible) — swap the face synchronously so the
        // second-half animation starts with the NEW face already in the DOM.
        // Without flushSync, React commits during phase 2 and the user sees the
        // OLD face for 3-4 frames after the rotation has started unfolding.
        flushSync(() => setIsRevealed(animation.targetRevealed));
        // Second half: start from the opposite edge so the card "unfolds" forward
        secondHalfRef.current = flipRef.current!.animate(
          [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }],
          { duration: flipDuration / 2, easing: 'ease-out', fill: 'forwards' }
        );
        secondHalfRef.current.finished.catch(() => {});
      }).catch(() => {});
    }

    return () => {
      travelAnim.cancel();
      flipCancelled = true;
      firstHalfAnim?.cancel();
      secondHalfRef.current?.cancel();
    };
    // animation and its derivatives are stable for the lifetime of this component:
    // the parent always mounts a new AnimatedCard per animation.id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  // When portaled into the hand-area, use the destination slot index as
  // z-index so the in-flight card stacks naturally with sibling hand cards
  // (slot 4 above slot 3, etc.) — eliminating the z-snap on landing.
  const zIndex = portalTarget
    ? animation.sourceInfo.index
    : 1000 - animation.sourceInfo.index;

  const node = (
    <div
      ref={rootRef}
      className={cn('animated-card', `animation-${animation.animationType}`)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        // Give the root explicit card dimensions so its transform-origin
        // (default 50% 50%) resolves to the card's geometric center. Without
        // this, an empty 0×0 root rotates around its top-left corner, which
        // offsets the rendered card by ~(h/2·sin θ, h/2·(1−cos θ)) — invisible
        // at 0° but visible at the ±8° extremity slots.
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        zIndex,
        pointerEvents: 'none',
      }}
    >
      {needsFlip ? (
        <div ref={flipRef}>
          <Card
            hint="AnimatedCard"
            card={animation.card}
            isRevealed={isRevealed}
            canBeGrabbed={false}
          />
        </div>
      ) : (
        <Card
          hint="AnimatedCard"
          card={animation.card}
          isRevealed={animation.sourceRevealed}
          canBeGrabbed={false}
        />
      )}
    </div>
  );

  return portalTarget ? createPortal(node, portalTarget) : node;
};
