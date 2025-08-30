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
  // Prefer the actual .card element center to capture overlap offsets
  const holderElement = handContainer.querySelector(`[data-card-index="${cardIndex}"]`) as HTMLElement | null;
  const cardElement = holderElement?.querySelector('.card') as HTMLElement | null;
  if (cardElement) {
    return getElementCenter(cardElement);
  }
  if (holderElement) {
    return getElementCenter(holderElement);
  }
  // Fallback: estimate position
  const baseRect = handContainer.getBoundingClientRect();
  return {
    x: baseRect.left + (cardIndex * 90) + 40,
    y: baseRect.top + baseRect.height / 2,
  };
};

/**
 * Get position of the top card in stock pile
 */
export const getStockCardPosition = (stockContainer: HTMLElement): CardPosition => {
  const cardElement = stockContainer.querySelector('.card') as HTMLElement;
  if (cardElement) {
    return getElementCenter(cardElement);
  }
  // Fallback to container center
  return getElementCenter(stockContainer);
};

/**
 * Get position of the top card in a discard pile
 */
export const getDiscardCardPosition = (
  discardContainer: HTMLElement,
  pileIndex: number
): CardPosition => {
  const pileElement = discardContainer.querySelector(`[data-pile-index="${pileIndex}"]`) as HTMLElement;
  if (pileElement) {
    const topCard = pileElement.querySelector('.card:last-child') as HTMLElement;
    if (topCard) {
      const nbOfCards = pileElement.querySelectorAll('.card').length;
      if (nbOfCards === 1) return getElementCenter(topCard);
      const pileCenter = getElementCenter(pileElement);
      const topCardCenter = getElementCenter(topCard);
      return {x: topCardCenter.x, y: topCardCenter.y + (topCardCenter.y - pileCenter.y) / nbOfCards};
    }
    return getElementCenter(pileElement);
  }
  // Fallback: estimate position based on pile index
  const baseRect = discardContainer.getBoundingClientRect();
  return {
    x: baseRect.left + 40,
    y: baseRect.top + (pileIndex * 120) + 60,
  };
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
  // Fallback: estimate position based on build pile index
  const baseRect = centerContainer.getBoundingClientRect();
  return {
    x: baseRect.left + (buildPileIndex * 90) + 40,
    y: baseRect.top + baseRect.height / 2,
  };
};

/**
 * Get position of the deck
 */
export const getDeckPosition = (centerContainer: HTMLElement): CardPosition => {
  const deckElement = centerContainer.querySelector('.deck') as HTMLElement;
  if (deckElement) {
    return getElementCenter(deckElement);
  }
  // Fallback to left side of center container
  const baseRect = centerContainer.getBoundingClientRect();
  return {
    x: baseRect.left + 40,
    y: baseRect.top + baseRect.height / 2,
  };
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
  const holderElement = handContainer.querySelector(`[data-card-index="${cardIndex}"]`) as HTMLElement | null;
  if (!holderElement) return 0;
  const style = window.getComputedStyle(holderElement);
  const rotateVar = style.getPropertyValue('--card-rotate');
  if (!rotateVar) return 0;
  const numeric = parseFloat(rotateVar.replace('deg', '').trim());
  return isNaN(numeric) ? 0 : numeric;
};

/**
 * Get the position where the next card should land on a discard pile (accounts for stacked offset)
 */
export const getNextDiscardCardPosition = (
  discardContainer: HTMLElement,
  pileIndex: number
): CardPosition => {
  const pileElement = discardContainer.querySelector(`[data-pile-index="${pileIndex}"]`) as HTMLElement | null;
  if (!pileElement) {
    // Fallback: container center
    return getElementCenter(discardContainer);
  }

  // Determine how many real cards are in the pile (exclude placeholder which has opacity-50)
  const allCards = Array.from(pileElement.querySelectorAll('.card')) as HTMLElement[];
  const realCards = allCards.filter(el => !el.classList.contains('opacity-50'));

  if (realCards.length === 0) {
    // Empty pile: land on the base position (placeholder center)
    // If a placeholder card exists, use its center; otherwise, use the pile center
    const placeholder = allCards[0];
    return placeholder ? getElementCenter(placeholder) : getElementCenter(pileElement);
  }

  const topCard = realCards[realCards.length - 1];
  const topCenter = getElementCenter(topCard);
  const styles = window.getComputedStyle(pileElement);
  const diffStr = styles.getPropertyValue('--stack-diff');
  const stackDiff = parseFloat(diffStr.replace('px', '').trim());
  const diff = isNaN(stackDiff) ? 20 : stackDiff;

  return { x: topCenter.x, y: topCenter.y + diff };
};
