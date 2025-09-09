import {Card as CardType} from '@/types';
import {cn} from '@/lib/utils';
import React, {MouseEventHandler, CSSProperties, memo, useState, useLayoutEffect} from "react";

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

const CardComponent: React.FC<CardProps> = ({
                                              card,
                                              isRevealed = true,
                                              isSelected = false,
                                              onClick,
                                              className,
                                              canBeGrabbed = false,
                                              stackIndex = undefined,
                                              overlapIndex = undefined,
                                              displayValue: overriddenDisplayValue
                                            }) => {
  const [morphing, setMorphing] = useState<'no' | 'yes' | 'after'>('no');

  const morphingDelay = 100;
  const morphingAfterDelay = 700;

  useLayoutEffect(() => {
    let timer1: NodeJS.Timeout, timer2: NodeJS.Timeout;
    if (card && card.isSkipBo) {
      setMorphing('yes');
      timer1 = setTimeout(() => setMorphing('after'), morphingDelay);
      timer2 = setTimeout(() => setMorphing('no'), morphingDelay + morphingAfterDelay);
    }
    return () =>  {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  }, [card, card?.isSkipBo]);

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
      <span className='card-corner-number'>{value}</span>
      <span>{value}</span>
    </> : <div className='back'></div>
  );

  if (card && shouldMorph) {
    // During morphing: outer card acts as a transparent wrapper to preserve layout/hover positions.
    const fromOpacity = morphing === 'yes' ? 1 : 0; // fade out after delay
    const toOpacity = morphing === 'yes' ? 0 : 1;   // fade in after delay

    return (
      <div
        className='card-morph-wrapper'
        style={style}
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

  // Default: render single card as before
  const content = renderContent(cardValue);

  return (card ?
      <div
        className={cn(
          'card', 'text-shadow-foreground', 'text-shadow-sm',
          card && card.isSkipBo && isRevealed && 'skip-bo',
          colourClass,
          morphing === 'after' && `transition duration-800`,
          isSelected && 'selected',
          canBeGrabbed && 'hoverable-card cursor-pointer',
          !canBeGrabbed && 'cursor-default',
          className
        )}
        onClick={onClick}
        style={style}
        data-value={card.value}
      >
        {content}
      </div>
      : <></>
  );
};

export const Card = memo(CardComponent);
