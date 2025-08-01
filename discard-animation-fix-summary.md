# Discard Animation Fix Summary

## Issue Description

There was a visual glitch during discard animations where cards from the human player's hand would appear unrevealed (face-down) for a split second when the animation started, before flipping to their revealed state.

## Root Cause

The issue was in the `AnimatedCard.tsx` component, where the `isRevealed` state was not properly initialized for discard animations. The previous implementation only had special handling for draw animations:

```typescript
setIsRevealed(!(animation.animationType === 'draw' && animation.sourceInfo.playerIndex === 1));
```

This meant that for discard animations, the `isRevealed` state would initially be `false` (the default state) and then be set to `true` when the animation started. This brief moment where `isRevealed` was `false` caused the card to appear unrevealed for a split second.

## Fix Implemented

The fix updates the logic in `AnimatedCard.tsx` to properly handle the revealed state for different animation types:

```typescript
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

This change ensures that:
- For draw animations: AI cards (playerIndex === 1) remain hidden, human cards are revealed
- For discard animations: Human cards (playerIndex === 0) remain revealed, AI cards remain hidden
- For other animations (play): All cards are revealed

## Testing

A test script (`test-discard-animation-fix.js`) was created to verify the fix. This script monitors discard animations and checks if the animated card remains revealed throughout the entire animation.

To run the test:
1. Start a game and wait for your turn
2. Run `window.stopMonitoring = window.monitorDiscardAnimations()` in the browser console
3. Select a card from your hand and discard it
4. Check the console logs to verify the card remains revealed throughout the animation

## Expected Results

With this fix, cards from the human player's hand should remain revealed throughout the entire discard animation, eliminating the visual glitch where they briefly appeared unrevealed at the start of the animation.

This improvement creates a more polished and visually consistent animation experience in the Skip-Bo game.