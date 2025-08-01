// Test script to verify card selection highlighting
// Run this in the browser console to test the shadow effect for selected cards

// Function to test stock pile selection
function testStockPileSelection() {
  console.log('Testing stock pile selection highlighting...');
  
  // Find the first player's stock pile card
  const stockPileCard = document.querySelector('.player-area .relative .card');
  
  if (!stockPileCard) {
    console.error('Stock pile card not found');
    return;
  }
  
  // Click the stock pile card to select it
  stockPileCard.click();
  
  // Check if the card has the selected class
  setTimeout(() => {
    const isSelected = stockPileCard.classList.contains('selected');
    console.log('Stock pile card selected:', isSelected);
    
    // Check computed style to verify shadow is applied
    const computedStyle = window.getComputedStyle(stockPileCard);
    console.log('Stock pile card box-shadow:', computedStyle.boxShadow);
    
    // Test discard pile selection
    testDiscardPileSelection();
  }, 500);
}

// Function to test discard pile selection
function testDiscardPileSelection() {
  console.log('Testing discard pile selection highlighting...');
  
  // Deselect any currently selected card
  document.body.click();
  
  // Find the first player's discard pile card (top card)
  const discardPileCards = document.querySelectorAll('.discard-pile-stack .card');
  const discardPileCard = discardPileCards[discardPileCards.length - 1];
  
  if (!discardPileCard) {
    console.error('Discard pile card not found');
    return;
  }
  
  // Click the discard pile card to select it
  discardPileCard.click();
  
  // Check if the card has the selected class
  setTimeout(() => {
    const isSelected = discardPileCard.classList.contains('selected');
    console.log('Discard pile card selected:', isSelected);
    
    // Check computed style to verify shadow is applied
    const computedStyle = window.getComputedStyle(discardPileCard);
    console.log('Discard pile card box-shadow:', computedStyle.boxShadow);
  }, 500);
}

// Start the test
testStockPileSelection();