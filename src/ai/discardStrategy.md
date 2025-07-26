# AI Discard Pile Strategy Improvement Plan

## Current Limitations
1. AI selects the first available discard pile without strategic consideration
2. AI picks the first non-Skip-Bo card to discard without evaluation
3. AI checks discard piles in order without prioritization

## Proposed Strategies

### 1. Strategic Discard Pile Selection
- Group same values together in discard piles
- Create sequential value patterns when possible
- Prefer empty piles over starting new sequences
- Use piles with higher values when appropriate

### 2. Intelligent Card Selection for Discarding
- Prioritize discarding duplicate cards in hand
- Avoid discarding cards needed for immediate play on build piles
- Prefer discarding higher value cards (harder to play)
- Consider discarding cards that block opponent's progress

### 3. Strategic Discard Pile Utilization
- Prioritize playing from discard piles with more cards
- Consider the impact of revealing cards underneath
- Balance between clearing piles and maintaining useful cards

### 4. Look-Ahead Discard Strategy
- Evaluate potential future plays after discarding
- Consider how discards affect both players' options
- Score potential discard moves based on multiple factors

## Implementation Plan

### Phase 1: Core Utility Functions
- `findBestDiscardPile(card, discardPiles)`
- `selectCardToDiscard(hand, gameState)`
- `evaluateDiscardMove(card, pile, gameState)`
- `findBestDiscardPileToPlayFrom(discardPiles, buildPiles, gameState)`

### Phase 2: Integration
- Update discard selection logic in `computeBestMove.ts`
- Enhance card selection for discarding
- Improve discard pile play prioritization
- Add game state awareness to decisions

### Phase 3: Configuration
- Add strategy weight constants
- Implement difficulty levels
- Allow for strategy customization

This plan will significantly improve the AI's strategic use of discard piles, making it a more formidable and realistic opponent.