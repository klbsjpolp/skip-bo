# Animation Glitches Fix Summary

## Issues Fixed

This update addresses two animation glitches in the Skip-Bo game:

1. **Cards appearing in hand before animation starts**: Cards were briefly visible in the hand before the draw animation started, creating a visual glitch.

2. **Card flipping during discard animations**: When a card moved from hand to discard pile, it would sometimes flip sides (isRevealing getting inverted), creating an unnatural visual effect.

## Changes Made

### 1. Fixed Card Flipping During Discard Animations

**File: `/src/components/AnimatedCard.tsx`**

Updated the logic for setting `isRevealed` to handle different animation types properly:

```typescript
// Before:
setIsRevealed(!(animation.animationType === 'draw' && animation.sourceInfo.playerIndex === 1));

// After:
if (animation.animationType === 'draw') {
  setIsRevealed(animation.sourceInfo.playerIndex !== 1);
} else if (animation.animationType === 'discard') {
  // For discard animations, maintain the same revealed state as in the hand
  // Human cards (playerIndex === 0) are revealed, AI cards (playerIndex === 1) are not
  setIsRevealed(animation.sourceInfo.playerIndex === 0);
} else {
  // For other animations (play), cards are always revealed
  setIsRevealed(true);
}
```

This change ensures that cards maintain their revealed state during discard animations, preventing the flipping effect.

### 2. Fixed Cards Appearing Before Animation Starts

**File: `/src/services/drawAnimationService.ts`**

Modified the `triggerMultipleDrawAnimations` function to return the actual maximum animation duration instead of 0:

```typescript
// Before:
// Return 0 duration so useSkipBoGame doesn't wait additionally
// This allows the game to proceed immediately while animations continue in the background
return 0;

// After:
// Return the maximum animation duration so useSkipBoGame waits for animations to complete
// This ensures cards don't appear in the game state until their animations finish
console.log(`📊 Returning duration: ${maxDuration}ms to ensure useSkipBoGame waits for animations`);
return maxDuration;
```

Also updated related comments to reflect the new behavior:

```typescript
// Before:
// Don't wait for all animations to complete
// Each card will appear independently when its animation completes
// This allows for a more natural staggered appearance

// We still keep track of the animations to ensure they complete properly
// but we don't make the game logic wait for them

// After:
// We return the maximum duration so the game logic waits for all animations to complete
// Each card will still appear independently when its animation completes
// This allows for a natural staggered appearance while preventing cards from appearing prematurely

// We still keep track of the animations to ensure they complete properly
// and log when all animations have finished
```

This change ensures that the game logic waits for animations to complete before updating the game state, preventing cards from appearing in the hand before their animations start.

## Expected Results

With these changes:

1. Cards will no longer appear in the hand before their draw animations start.
2. Cards will maintain their revealed state during discard animations, preventing the flipping effect.

These improvements create a more polished and visually consistent animation experience in the Skip-Bo game.