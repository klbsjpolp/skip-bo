# Card Visual Behavior Documentation

This document outlines the consistent visual behavior patterns for all card interactions in the Skip-Bo game. These behaviors ensure a cohesive user experience across all card types and game states.

## Overview

All cards in the game follow consistent visual feedback patterns for hover, selection, and interaction states. The implementation uses CSS custom properties to allow multiple transform effects to work together without conflicts.

## Card Types

The game includes three main card interaction areas:
- **Hand Cards**: Player's cards that can be selected and played
- **Stock Cards**: Top card of player's stock pile
- **Discard Cards**: Top cards of discard piles

## Visual States & Priority

### State Priority (Highest to Lowest)
1. **Selected** - Always takes precedence over hover
2. **Hover** - Shows when card is hoverable but not selected  
3. **Default** - Base state

### Visual Effects

#### Default State
- Base shadow: `box-shadow: var(--card-shadow)`
- Transform: `translateY(0px) scale(1) rotate(0deg)`
- Cursor: `cursor-default` (non-grabbable) or `cursor-pointer` (grabbable)

#### Hover State (`.hoverable-card:hover`)
- Enhanced shadow: `box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15)`
- Transform: `translateY(-2px) scale(1.05) rotate(0deg)`
- Growth: Card grows slightly and lifts up
- **Only applies to grabbable cards**

#### Selected State (`.card.selected`)
- Selection shadow: `box-shadow: 0 4px 15px var(--selected-border)`
- Transform: `translateY(-5px) scale(1) rotate(0deg)`  
- Border: `border-color: var(--selected-border)`
- **Always overrides hover effects**

## Implementation Details

### CSS Custom Properties
The system uses CSS custom properties to manage transforms:
```css
.card {
  --card-rotate: 0deg;
  --card-translate-y: 0px;
  --card-scale: 1;
  transform: translateY(var(--card-translate-y)) scale(var(--card-scale)) rotate(var(--card-rotate));
}
```

This allows multiple transform effects to coexist:
- Hand card rotation (overlapping cards)
- Hover effects (scale + translateY)
- Selection effects (translateY)

### CSS Specificity Rules

#### Basic Rules
- `.hoverable-card:hover` - Hover effects for grabbable cards
- `.card.selected` - Selection effects for all cards

#### High-Specificity Override Rules
For discard pile cards that need special handling:
- `.discard-pile-stack .card.selected.hoverable-card:hover` - Ensures selection shadow overrides hover
- `.discard-pile-stack .hoverable-card:hover` - Provides hover shadow for non-selected cards

## Cursor Behavior

### Pointer Cursor (`cursor-pointer`)
- Applied when: `canBeGrabbed={true}` AND `onClick` is provided
- Indicates: Card can be interacted with

### Default Cursor (`cursor-default`)
- Applied when: `canBeGrabbed={false}` OR no `onClick` provided
- Indicates: Card is not interactive (deck, construction piles, AI cards)

## Card-Specific Behaviors

### Hand Cards
- **Hover**: ✅ Grow + shadow
- **Selection**: ✅ Pop up + selection shadow  
- **Rotation**: ✅ Preserved when overlapping (>4 cards)
- **Deselection**: ✅ Click same card to deselect

### Stock Cards  
- **Hover**: ✅ Grow + shadow
- **Selection**: ✅ Pop up + selection shadow
- **Deselection**: ✅ Click same card to deselect

### Discard Cards
- **Hover**: ✅ Grow + shadow
- **Selection**: ✅ Pop up + selection shadow
- **Deselection**: ✅ Click same card to deselect
- **Special**: Uses high-specificity CSS rules to maintain consistency

### Non-Interactive Cards (Deck, Construction, AI)
- **Hover**: ❌ No effects
- **Selection**: ❌ Not selectable
- **Cursor**: ✅ Default cursor only

## Theme Consistency

All themes (Light, Dark, Metro, Neon, Retro) follow the same behavioral patterns:
- Same transform effects
- Same timing and transitions
- Theme-specific colors via CSS variables
- Special neon theme glow effects while maintaining consistent behavior

### Neon Theme Special Cases
- Selection shadow: `box-shadow: 0 0 20px var(--selected-border)`
- Hover shadow: Enhanced glow effects
- Priority rules: Selection still overrides hover

## Drop Target Indicators

### Behavior
- **Show**: Only on hover over valid drop zones
- **Hide**: When not hovering or invalid drop
- **Visual**: Orange line on top of drop zone
- **Implementation**: `.drop-target-hover:hover::before`

### Consistency
All drop targets use the same visual indicator:
- Discard piles: Top line when hovering with selected hand card
- Build piles: Top line when hovering with valid card

## Testing Strategy

### Unit Tests
- `CardInteractionBehavior.test.tsx`: Tests component props and class application
- `CardVisualBehavior.test.tsx`: Tests CSS rules and visual effects
- `CardAngle.test.tsx`: Tests rotation behavior for overlapping cards

### Test Coverage
- ✅ Cursor behavior validation
- ✅ Hover class application  
- ✅ Selection class application
- ✅ Transform custom properties
- ✅ CSS specificity rules
- ✅ Cross-theme consistency
- ✅ Priority order validation

## Breaking Changes Prevention

### Critical CSS Rules
These CSS rules must maintain their specificity to preserve behavior:

```css
/* HIGH PRIORITY - DO NOT MODIFY SPECIFICITY */
.discard-pile-stack .card.selected.hoverable-card:hover {
  box-shadow: 0 4px 15px var(--selected-border);
}

.neon .discard-pile-stack .card.selected.hoverable-card:hover {
  box-shadow: 0 0 20px var(--selected-border);
}
```

### Component Props
These props must remain consistent:
- `canBeGrabbed`: Controls hover effects and cursor
- `isSelected`: Controls selection visual state
- `onClick`: Required for interactive behavior

## Future Modifications

When making changes:
1. **Run tests**: Ensure `CardInteractionBehavior.test.tsx` and `CardVisualBehavior.test.tsx` pass
2. **Check specificity**: New CSS rules should not override selection priority
3. **Test all themes**: Verify behavior across all visual themes
4. **Validate consistency**: All card types should behave identically for the same states

## Troubleshooting

### Common Issues
1. **Hover overrides selection**: Check CSS specificity rules
2. **Cards not hoverable**: Verify `canBeGrabbed={true}` and `hoverable-card` class
3. **Wrong cursor**: Check `canBeGrabbed` and `onClick` props combination
4. **Transform conflicts**: Ensure CSS custom properties are used instead of inline transforms

### Debug Tools
- Browser DevTools: Inspect computed styles and CSS custom properties
- Test files: Run specific test suites to isolate issues
- Console: Check for CSS custom property values with `element.style.getPropertyValue('--card-rotate')`
