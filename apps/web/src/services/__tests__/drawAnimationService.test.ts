import { beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateMultipleDrawAnimationDuration, triggerMultipleDrawAnimations } from '@/services/drawAnimationService';

const createRect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  }) as DOMRect;

const setElementRect = (element: Element, rect: DOMRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => rect });
};

const mountBoard = (): void => {
  const playerArea = document.createElement('div');
  playerArea.className = 'player-area';
  playerArea.setAttribute('data-player-index', '0');

  const handArea = document.createElement('div');
  handArea.className = 'hand-area';
  setElementRect(handArea, createRect(120, 420, 360, 120));
  handArea.style.setProperty('--card-width', '80px');
  handArea.style.setProperty('--card-height', '120px');
  for (const index of [0, 1]) {
    const holder = document.createElement('div');
    holder.setAttribute('data-card-index', String(index));
    setElementRect(holder, createRect(120 + index * 90, 420, 80, 120));
    handArea.appendChild(holder);
  }
  playerArea.appendChild(handArea);

  const centerArea = document.createElement('div');
  centerArea.className = 'center-area';
  setElementRect(centerArea, createRect(300, 100, 400, 220));
  const deck = document.createElement('div');
  deck.setAttribute('data-deck', '');
  setElementRect(deck, createRect(320, 120, 80, 120));
  centerArea.appendChild(deck);

  document.body.append(playerArea, centerArea);
};

describe('drawAnimationService', () => {
  const startAnimation = vi.fn((animation: { initialDelay: number }) => {
    void animation;
    return 'animation-id';
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    startAnimation.mockClear();
  });

  it('fires one staggered deck→hand animation per drawn card', async () => {
    mountBoard();
    const cards = [
      { value: 4, isSkipBo: false },
      { value: 5, isSkipBo: false },
    ];

    const total = await triggerMultipleDrawAnimations({ startAnimation }, 0, cards, [0, 1], 500, 0);

    expect(startAnimation).toHaveBeenCalledTimes(2);
    expect(startAnimation.mock.calls.map(([animation]) => animation.initialDelay)).toEqual([0, 500]);
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(calculateMultipleDrawAnimationDuration(0, [0, 1], 500, 0));
  });

  it('returns 0 without firing when the board is not mounted', async () => {
    const total = await triggerMultipleDrawAnimations({ startAnimation }, 0, [{ value: 4, isSkipBo: false }], [0]);

    expect(total).toBe(0);
    expect(startAnimation).not.toHaveBeenCalled();
  });

  it('rejects mismatched cards/indices input', async () => {
    mountBoard();
    const total = await triggerMultipleDrawAnimations({ startAnimation }, 0, [{ value: 4, isSkipBo: false }], [0, 1]);

    expect(total).toBe(0);
    expect(startAnimation).not.toHaveBeenCalled();
  });
});
