// Simple test script to verify animation position calculations
// This can be run in the browser console when the game is loaded

function testAnimationPositions() {
  console.log('Testing animation position calculations...');
  
  // Check if player areas are correctly identified
  const playerAreas = document.querySelectorAll('.player-area');
  console.log(`Found ${playerAreas.length} player areas`);
  
  if (playerAreas.length >= 2) {
    console.log('Player area 0 (Human):', playerAreas[0]);
    console.log('Player area 1 (AI):', playerAreas[1]);
    
    // Test hand card position calculation for human player
    const humanHandArea = playerAreas[0].querySelector('.hand-area');
    if (humanHandArea) {
      console.log('Human hand area found:', humanHandArea);
      const handCards = humanHandArea.querySelectorAll('.card-holder');
      console.log(`Found ${handCards.length} hand card holders`);
    }
    
    // Test discard pile position calculation for human player
    const humanDiscardArea = playerAreas[0].querySelector('.discard-piles');
    if (humanDiscardArea) {
      console.log('Human discard area found:', humanDiscardArea);
      const discardPiles = humanDiscardArea.querySelectorAll('.discard-pile-stack');
      console.log(`Found ${discardPiles.length} discard piles`);
    }
    
    // Test center area
    const centerArea = document.querySelector('.center-area');
    if (centerArea) {
      console.log('Center area found:', centerArea);
      const buildPiles = centerArea.querySelectorAll('[data-build-pile]');
      console.log(`Found ${buildPiles.length} build piles`);
    }
  } else {
    console.error('Not enough player areas found!');
  }
}

// Run the test
testAnimationPositions();