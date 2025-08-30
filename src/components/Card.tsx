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
  const morphingAfterDelay = 800;

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

  const content = isRevealed ? <>
    <div className='card-inner'></div>
    <span className='card-corner-number'>{cardValue}</span>
    <span>{cardValue}</span>
  </> : <div className='back'></div>;

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
      >
        {content}
      </div>
      : <></>
  );
};

export const Card = memo(CardComponent);
