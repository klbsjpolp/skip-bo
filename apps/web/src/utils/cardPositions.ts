/**
 * Utility functions for calculating card positions on screen
 * These functions help determine start and end positions for card animations
 */

export interface CardPosition {
  x: number;
  y: number;
}

/**
 * Get the center position of a DOM element
 */
export const getElementCenter = (element: HTMLElement): CardPosition => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};

/**
 * Get position of a card in a player's hand
 */
export const getHandCardPosition = (
  handContainer: HTMLElement,
  cardIndex: number,
): CardPosition => {
  const holderElement = handContainer.querySelector<HTMLElement>(`[data-card-index="${cardIndex}"]`);
  const cardElement = holderElement?.querySelector<HTMLElement>('.card.selected, .card');

  if (cardElement) {
    return getElementCenter(cardElement);
  }

  // Slot is empty (e.g. draw animation targeting an unfilled slot).
  // Card.tsx always applies overlapIndex offsets (handOverlaps is always true for a
  // 5-card hand) and the .hand-area holders are narrow, so we compute the final
  // card position from the hand container's rect + the same offsets Card.tsx uses.
  const handRect = handContainer.getBoundingClientRect();
  const handStyle = getComputedStyle(handContainer);
  const cardW = parseFloat(handStyle.getPropertyValue('--card-width')) || 0;
  const cardH = parseFloat(handStyle.getPropertyValue('--card-height')) || 0;
  if (cardW > 0 && cardH > 0) {
    // Mirrors Card.tsx: left = overlapIndex * (cardWidth - 10), top = yOffsets[overlapIndex]
    const yOffsets = [4, -3, -5, -3, 4];
    const yOff = yOffsets[cardIndex] ?? 0;
    return {
      x: handRect.left + cardIndex * (cardW - 10) + cardW / 2,
      y: handRect.top + yOff + cardH / 2,
    };
  }

  console.warn(`[cardPositions] hand dimensions unavailable for index ${cardIndex}, falling back to container center`);
  return getElementCenter(handContainer);
};

/**
 * Get position of the top card in stock pile
 */
export const getStockCardPosition = (stockContainer: HTMLElement): CardPosition => {
  const cardElement = stockContainer.querySelector('.card') as HTMLElement;
  if (cardElement) {
    return getElementCenter(cardElement);
  }

  return getElementCenter(stockContainer);
};

/**
 * Get position of a build pile
 */
export const getBuildPilePosition = (
  centerContainer: HTMLElement,
  buildPileIndex: number
): CardPosition => {
  const buildPileElement = centerContainer.querySelector(
    `[data-build-pile="${buildPileIndex}"]`
  ) as HTMLElement;
  if (buildPileElement) {
    return getElementCenter(buildPileElement);
  }

  return getElementCenter(centerContainer);
};

/**
 * Get position of the deck
 */
export const getDeckPosition = (centerContainer: HTMLElement): CardPosition => {
  const deckElement = centerContainer.querySelector('.deck') as HTMLElement;
  if (deckElement) {
    return getElementCenter(deckElement);
  }
  console.warn('[cardPositions] deck element not found, falling back to container center');
  return getElementCenter(centerContainer);
};

/**
 * Get the position of the retreat pile.
 */
export const getRetreatPilePosition = (centerContainer: HTMLElement): CardPosition => {
  const retreatPileElement = centerContainer.querySelector('[data-retreat-pile]') as HTMLElement;
  if (retreatPileElement) {
    return getElementCenter(retreatPileElement);
  }

  return getElementCenter(centerContainer);
};

/**
 * Calculate animation duration based on distance
 */
export const calculateAnimationDuration = (
  startPos: CardPosition,
  endPos: CardPosition,
  baseSpeed: number = 0.5 // pixels per millisecond
): number => {
  const distance = Math.sqrt(
    Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
  );
  const duration = Math.max(300, Math.min(800, distance / baseSpeed));
  return Math.round(duration);
};

/**
 * Get rotation angle (in degrees) of a card in the player's hand
 */
export const getHandCardAngle = (
  handContainer: HTMLElement,
  cardIndex: number,
): number => {
  const holderElement = handContainer.querySelector(`[data-card-index="${cardIndex}"]`);
  if (!holderElement) return 0;
  const style = window.getComputedStyle(holderElement);
  const rotateVar = style.getPropertyValue('--card-rotate');
  if (!rotateVar) return 0;
  const numeric = parseFloat(rotateVar.replace('deg', '').trim());
  return isNaN(numeric) ? 0 : numeric;
};

/**
 * Get the top card center for a discard pile.
 */
export const getDiscardTopCardPosition = (
  discardContainer: HTMLElement,
  pileIndex: number
): CardPosition => {
  const pileElement = discardContainer.querySelector<HTMLElement>(`[data-pile-index="${pileIndex}"]`);
  if (!pileElement) {
    return getElementCenter(discardContainer);
  }

  const allCards = Array.from(pileElement.querySelectorAll<HTMLElement>('.card'));
  const realCards = allCards.filter((el) => !el.classList.contains('opacity-50'));

  if (realCards.length === 0) {
    const placeholder = allCards[0];
    return placeholder ? getElementCenter(placeholder) : getElementCenter(pileElement);
  }

  return getElementCenter(realCards[realCards.length - 1]);
};

/**
 * Get the position where the next card should land on a discard pile (accounts for stacked offset)
 */
export const getNextDiscardCardPosition = (
  discardContainer: HTMLElement,
  pileIndex: number
): CardPosition => {
  const pileElement = discardContainer.querySelector<HTMLElement>(`[data-pile-index="${pileIndex}"]`);
  if (!pileElement) {
    // Fallback: container center
    return getElementCenter(discardContainer);
  }

  // Determine how many real cards are in the pile (exclude placeholder which has opacity-50)
  const allCards = Array.from(pileElement.querySelectorAll<HTMLElement>('.card'));
  const realCards = allCards.filter(el => !el.classList.contains('opacity-50'));

  if (realCards.length === 0) {
    // Empty pile: land on the base position (placeholder center)
    // If a placeholder card exists, use its center; otherwise, use the pile center
    const placeholder = allCards[0];
    return placeholder ? getElementCenter(placeholder) : getElementCenter(pileElement);
  }

  const topCenter = getElementCenter(realCards[realCards.length - 1]);
  const styles = window.getComputedStyle(pileElement);
  const diffStr = styles.getPropertyValue('--stack-diff');
  const stackDiff = parseFloat(diffStr.replace('px', '').trim());
  const diff = isNaN(stackDiff) ? 20 : stackDiff;

  return { x: topCenter.x, y: topCenter.y + diff };
};
