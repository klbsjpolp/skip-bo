# Skip-Bo AI Implementation

This directory contains the implementation of the AI player for the Skip-Bo game.

## Overview

The AI uses a strategic decision-making system to determine the best moves during gameplay. The main components are:

- `computeBestMove.ts`: The main AI function that determines the next action
- `discardUtils.ts`: Utility functions for strategic discard pile handling
- `aiConfig.ts`: Configuration options for AI difficulty levels and strategy weights

## Discard Pile Strategy

The AI employs sophisticated strategies for handling discard piles, which are crucial for effective gameplay:

### 1. Strategic Discard Pile Selection

When discarding a card, the AI evaluates each discard pile and scores them based on:
- **Same Value Grouping**: Prioritizes piles with the same value on top
- **Sequential Values**: Favors creating sequences (e.g., placing a 5 on a 4 or 6)
- **Empty Pile Preference**: Considers when to start a new pile
- **Value Preservation**: Prefers to discard on higher value cards to preserve lower values for play

### 2. Intelligent Card Selection for Discarding

When choosing which card to discard, the AI considers:
- **Duplicate Cards**: Prioritizes discarding duplicate values in hand
- **Needed Values**: Avoids discarding cards that could be played soon on build piles
- **Card Value**: Prefers discarding higher value cards (harder to play)

### 3. Strategic Discard Pile Utilization

When playing from discard piles, the AI:
- **Prioritizes Larger Piles**: Focuses on clearing piles with more cards
- **Evaluates Multiple Options**: Scores all possible plays to find the optimal move

### 4. Look-Ahead Strategy

For more advanced difficulty levels, the AI:
- **Evaluates Future Impact**: Considers how a discard might affect future plays
- **Scores Potential Moves**: Assigns scores to potential discard moves based on multiple factors

## Difficulty Levels

The AI supports three difficulty levels:

### Easy
- Basic discard pile selection
- Simple card selection (first available non-Skip-Bo card)
- No strategic discard pile play prioritization
- No look-ahead strategy

### Medium
- Strategic discard pile selection
- Intelligent card selection
- Strategic discard pile play prioritization
- No look-ahead strategy

### Hard
- Enhanced discard pile selection with higher weights for strategic factors
- Advanced card selection with stronger preference for optimal choices
- Prioritized discard pile play with emphasis on clearing larger piles
- Look-ahead strategy enabled

## Configuration

The AI's behavior can be customized by modifying the weights and settings in `aiConfig.ts`. This allows for fine-tuning the AI's strategy and creating different difficulty levels.

## Integration

The AI is integrated with the game's state machine through the `computeBestMove` function, which is called during the AI's turn to determine the next action.

## Future Improvements

Potential areas for enhancement:
- Opponent awareness (tracking which cards the human player might need)
- Adaptive strategy based on game phase (early, mid, late game)
- Machine learning to optimize strategy weights based on gameplay data