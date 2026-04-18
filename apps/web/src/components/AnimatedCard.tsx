import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
    const sx = animation.startPosition.x - halfW;
    const sy = animation.startPosition.y - halfH;
    const ex = animation.endPosition.x - halfW;
    const ey = animation.endPosition.y - halfH;

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
        // Card is edge-on (invisible) — swap the face; the re-render is imperceptible
        setIsRevealed(animation.targetRevealed);
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

  return (
    <div
      ref={rootRef}
      className={cn('animated-card', `animation-${animation.animationType}`)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 1000 - animation.sourceInfo.index,
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
};
