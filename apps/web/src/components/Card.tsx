import type {Card as CardType} from '@/types';
import {cn} from '@/lib/utils';
import type {CSSProperties, HTMLAttributes, KeyboardEventHandler, MouseEventHandler} from "react";
import React, {memo, useLayoutEffect, useState} from "react";

interface CardProps {
  card: CardType | null,
  isRevealed?: boolean,
  isSelected?: boolean,
  onClick?: MouseEventHandler,
  className?: string,
  canBeGrabbed?: boolean,
  stackIndex?: number,
  overlapIndex?: number,
  displayValue?: string,
  hint?: string
}

function getTextAndColourForCard(card: CardType | null, overriddenDisplayValue: string | undefined, isRevealed: boolean) {
  if (!card || !isRevealed) return { colourClass: '', cardValue: '' };
  const cardValue = (overriddenDisplayValue === undefined) ? (card.isSkipBo ? 'Skip-Bo' : card.value?.toString() ?? '') : overriddenDisplayValue;
  const colourClass =
    (cardValue === 'Skip-Bo') ? 'skipbo-text' :
      (Number(cardValue) <= 4) ? 'card-range-1' :
        (Number(cardValue) <= 8) ? 'card-range-2' :
          (Number(cardValue) <= 12) ? 'card-range-3' : '';
  return { colourClass, cardValue };
}

const MORPH_START_DELAY_MS = 50;

const CardComponent: React.FC<CardProps> = ({
                                              card,
                                              isRevealed = true,
                                              isSelected = false,
                                              onClick,
                                              className,
                                              canBeGrabbed = false,
                                              stackIndex = undefined,
                                              overlapIndex = undefined,
                                              displayValue: overriddenDisplayValue,
                                              hint,
                                            }) => {
  // When a Skip-Bo card is rendered with a displayValue (e.g. settled on a build
  // pile), morph from the Skip-Bo face to the numeric value. Start in 'yes' via
  // the useState initializer so the first painted frame shows Skip-Bo — otherwise
  // the user sees the numeric value flash before the morph begins. Callers must
  // give the Card a key derived from card identity so a new play remounts this
  // component and the initializer re-runs.
  const isMorphCandidate = Boolean(card?.isSkipBo && overriddenDisplayValue !== undefined);
  const [morphing, setMorphing] = useState<'no' | 'yes' | 'after'>(
    isMorphCandidate ? 'yes' : 'no'
  );

  useLayoutEffect(() => {
    if (!isMorphCandidate) return;
    // Transition to 'after' to start the crossfade, then stay there — the card is
    // remounted via `key` on each new play so there is no need to clean up state.
    // Switching back to 'no' (single-card branch) causes a DOM structure swap that
    // shifts the corner-number by 1-2 px due to absolute vs. static positioning.
    const toAfter = setTimeout(() => setMorphing('after'), MORPH_START_DELAY_MS);
    return () => clearTimeout(toAfter);
  }, [isMorphCandidate]);

  // Determine whether we should render a morphing overlay
  const shouldMorph = Boolean(
    card && isRevealed && card.isSkipBo && overriddenDisplayValue !== undefined && morphing !== 'no'
  );

  // Prepare values for both layers
  const fromData = getTextAndColourForCard(card, undefined, isRevealed);
  const toData = getTextAndColourForCard(card, overriddenDisplayValue, isRevealed);

  // Keep backward compatibility (single content) for non-morphing state
  const { colourClass, cardValue } = getTextAndColourForCard(card, morphing === 'yes' ? undefined : overriddenDisplayValue, isRevealed);

  let style: CSSProperties | undefined = undefined;
  if (stackIndex !== undefined) {
    style = {
      top: `calc(var(--stack-diff) * ${stackIndex})`,
      zIndex: stackIndex,
    }
  } else if (overlapIndex !== undefined) {
    const offset = [4, -3, -5, -3, 4][overlapIndex]

    style = {
      left: `calc(${overlapIndex} * (var(--card-width) - 10px))`,
      top: `${offset}px`,
      zIndex: overlapIndex
    } as CSSProperties;
  }

  const renderContent = (value: string) => (
    isRevealed ? <>
      <div className='card-inner'></div>
      <div className='card-inner-2'></div>
      <span className='card-corner-inset' aria-hidden='true'></span>
      <span className='card-corner-number'>{value}</span>
      <span className="card-number">{value}</span>
    </> : <div className='back'></div>
  );

  const interactiveProps: HTMLAttributes<HTMLDivElement> = onClick ? {
    onClick,
    role: 'button',
    tabIndex: 0,
    'aria-label': hint ?? cardValue,
    'aria-pressed': isSelected ? true : undefined,
    onKeyDown: ((event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(event as unknown as Parameters<NonNullable<CardProps['onClick']>>[0]);
      }
    }) as KeyboardEventHandler<HTMLDivElement>,
  } : {};

  if (card && shouldMorph) {
    const fromOpacity = morphing === 'yes' ? 1 : 0;
    const toOpacity = morphing === 'yes' ? 0 : 1;

    return (
      <div
        className='card-morph-wrapper'
        style={style}
        {...interactiveProps}
      >
        {/* FROM (Skip-Bo) layer */}
        <div
          className={cn(
            'card', 'card-morph-layer',
            className,
            fromData.colourClass
          )}
          style={{ opacity: fromOpacity }}
        >
          {renderContent(fromData.cardValue)}
        </div>

        {/* TO (new value) layer */}
        <div
          className={cn(
            'card', 'card-morph-layer',
            className,
            toData.colourClass
          )}
          style={{ opacity: toOpacity }}
          data-value={toData.cardValue}
        >
          {renderContent(toData.cardValue)}
        </div>
      </div>
    );
  }

  const content = renderContent(cardValue);

  return (card ?
      <div
        className={cn(
          'card',
          (card && isRevealed) && (cardValue === 'Skip-Bo' ? 'skip-bo' : 'normal-card'),
          colourClass,
          morphing === 'after' && `transition duration-800`,
          isSelected && 'selected',
          canBeGrabbed && 'hoverable-card cursor-pointer',
          !canBeGrabbed && 'cursor-default',
          className
        )}
        style={style}
        data-value={card.value}
        {...interactiveProps}
      >
        {content}
      </div>
      : <></>
  );
};

export const Card = memo(CardComponent);
