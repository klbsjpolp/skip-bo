import type { CardAnimationData } from '@/contexts/CardAnimationContext';
import type { SoundEventId } from './types';

/**
 * Map a card animation to the sound it should make when its travel begins.
 * `complete` (pile-completion retreats) is intentionally excluded: it staggers
 * many cards, so its single reward chime is fired once from the
 * completedBuildPileAnimationService instead of per-card.
 */
export const soundForAnimation = (animation: CardAnimationData): SoundEventId | null => {
  switch (animation.animationType) {
    case 'play':
      return animation.card?.isSkipBo ? 'skipbo-accent' : 'build-snap';
    case 'discard':
      return 'discard';
    case 'draw':
      return 'draw';
    case 'complete':
      return null;
    default:
      return null;
  }
};
