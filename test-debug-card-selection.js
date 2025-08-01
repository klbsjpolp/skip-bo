// Debug script for card selection highlighting issues
// Run this in the browser console to diagnose why shadows aren't appearing

function debugCardSelection() {
  console.log('=== CARD SELECTION DEBUGGING ===');
  
  // 1. Check if stock pile card exists
  const stockPileCard = document.querySelector('.player-area .relative .card');
  console.log('Stock pile card found:', !!stockPileCard);
  
  if (stockPileCard) {
    // 2. Check computed styles
    const stockStyles = window.getComputedStyle(stockPileCard);
    console.log('Stock pile card current styles:');
    console.log('- box-shadow:', stockStyles.boxShadow);
    console.log('- z-index:', stockStyles.zIndex);
    console.log('- position:', stockStyles.position);
    
    // 3. Test selection by adding class directly
    console.log('Applying selected class directly to stock pile card...');
    stockPileCard.classList.add('selected');
    
    // 4. Check if class was applied
    console.log('Selected class applied:', stockPileCard.classList.contains('selected'));
    
    // 5. Check computed styles again
    setTimeout(() => {
      const updatedStyles = window.getComputedStyle(stockPileCard);
      console.log('Stock pile card styles after adding selected class:');
      console.log('- box-shadow:', updatedStyles.boxShadow);
      console.log('- z-index:', updatedStyles.zIndex);
      
      // 6. Check CSS specificity by inspecting all applied styles
      console.log('Checking CSS specificity issues...');
      const allStyles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules);
          } catch (e) {
            return [];
          }
        })
        .filter(rule => rule.type === 1) // CSSStyleRule
        .filter(rule => {
          try {
            return stockPileCard.matches(rule.selectorText);
          } catch (e) {
            return false;
          }
        })
        .map(rule => ({
          selector: rule.selectorText,
          specificity: calculateSpecificity(rule.selectorText),
          boxShadow: rule.style.boxShadow || 'none'
        }))
        .sort((a, b) => b.specificity - a.specificity);
      
      console.log('Applied style rules (sorted by specificity):', allStyles);
      
      // Now test discard pile
      debugDiscardPileSelection();
    }, 500);
  } else {
    console.error('Stock pile card not found, skipping to discard pile test');
    debugDiscardPileSelection();
  }
}

function debugDiscardPileSelection() {
  console.log('\n=== DISCARD PILE SELECTION DEBUGGING ===');
  
  // 1. Check if discard pile card exists
  const discardPileCards = document.querySelectorAll('.discard-pile-stack .card');
  const discardPileCard = discardPileCards[discardPileCards.length - 1];
  console.log('Discard pile card found:', !!discardPileCard);
  
  if (discardPileCard) {
    // 2. Check computed styles
    const discardStyles = window.getComputedStyle(discardPileCard);
    console.log('Discard pile card current styles:');
    console.log('- box-shadow:', discardStyles.boxShadow);
    console.log('- z-index:', discardStyles.zIndex);
    console.log('- position:', discardStyles.position);
    
    // 3. Test selection by adding class directly
    console.log('Applying selected class directly to discard pile card...');
    discardPileCard.classList.add('selected');
    
    // 4. Check if class was applied
    console.log('Selected class applied:', discardPileCard.classList.contains('selected'));
    
    // 5. Check computed styles again
    setTimeout(() => {
      const updatedStyles = window.getComputedStyle(discardPileCard);
      console.log('Discard pile card styles after adding selected class:');
      console.log('- box-shadow:', updatedStyles.boxShadow);
      console.log('- z-index:', updatedStyles.zIndex);
      
      // 6. Check parent elements that might be affecting the card
      console.log('\nChecking parent elements that might affect styling:');
      let parent = discardPileCard.parentElement;
      let depth = 1;
      
      while (parent && depth <= 5) {
        console.log(`Parent ${depth}:`, parent.className);
        const parentStyle = window.getComputedStyle(parent);
        console.log(`- position: ${parentStyle.position}`);
        console.log(`- z-index: ${parentStyle.zIndex}`);
        console.log(`- overflow: ${parentStyle.overflow}`);
        
        parent = parent.parentElement;
        depth++;
      }
      
      // 7. Suggest fixes based on findings
      suggestFixes();
    }, 500);
  } else {
    console.error('Discard pile card not found');
    suggestFixes();
  }
}

// Helper function to calculate CSS specificity (simplified)
function calculateSpecificity(selector) {
  let specificity = 0;
  
  // Count IDs
  specificity += (selector.match(/#[a-zA-Z0-9_-]+/g) || []).length * 100;
  
  // Count classes, attributes and pseudo-classes
  specificity += (selector.match(/\.[a-zA-Z0-9_-]+|\[[^\]]+]|:[a-zA-Z0-9_-]+/g) || []).length * 10;
  
  // Count elements and pseudo-elements
  specificity += (selector.match(/[a-zA-Z0-9_-]+|::[a-zA-Z0-9_-]+/g) || []).length;
  
  return specificity;
}

function suggestFixes() {
  console.log('\n=== SUGGESTED FIXES ===');
  console.log('Based on the debugging results, here are potential fixes:');
  console.log('1. Check if !important is needed for the box-shadow property');
  console.log('2. Verify that no parent element is clipping or hiding the shadow');
  console.log('3. Ensure the selected card has a higher z-index than surrounding elements');
  console.log('4. Check if any theme-specific styles are overriding the selection styles');
  console.log('5. Verify that the CSS is being properly loaded and not minified incorrectly');
}

// Start debugging
debugCardSelection();