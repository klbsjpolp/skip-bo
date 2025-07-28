// Debug script to identify why deck-to-hand animations are not working
// This can be run in the browser console when the game is loaded

function debugDeckToHandAnimations() {
  console.log('🔍 DEBUGGING DECK-TO-HAND ANIMATIONS');
  console.log('=====================================');
  
  // Check if the game UI is loaded
  const playerAreas = document.querySelectorAll('.player-area');
  const centerArea = document.querySelector('.center-area');
  
  console.log('\n1. DOM ELEMENT DETECTION:');
  console.log(`Player areas found: ${playerAreas.length}`);
  console.log(`Center area found: ${centerArea ? 'YES' : 'NO'}`);
  
  if (playerAreas.length >= 2) {
    console.log('✅ Basic DOM structure is present');
    
    // Check specific elements needed for animations
    playerAreas.forEach((area, index) => {
      const handArea = area.querySelector('.hand-area');
      const deckArea = centerArea?.querySelector('.deck');
      
      console.log(`Player ${index} hand area: ${handArea ? 'FOUND' : 'MISSING'}`);
      if (index === 0) {
        console.log(`Deck area: ${deckArea ? 'FOUND' : 'MISSING'}`);
      }
    });
  } else {
    console.log('❌ Required DOM elements missing');
    return;
  }
  
  // Check if animation context is available
  console.log('\n2. ANIMATION CONTEXT CHECK:');
  
  // Try to access the global animation context (this is a hack for debugging)
  let contextAvailable = false;
  try {
    // We can't directly access the global context, but we can check if React context is working
    const reactRoot = document.getElementById('root');
    if (reactRoot && reactRoot._reactInternalFiber || reactRoot._reactInternalInstance) {
      console.log('✅ React context appears to be active');
      contextAvailable = true;
    } else {
      console.log('❌ React context may not be properly initialized');
    }
  } catch (error) {
    console.log('❌ Error checking React context:', error);
  }
  
  // Check if CardAnimationLayer is present
  console.log('\n3. ANIMATION LAYER CHECK:');
  const animationLayer = document.querySelector('.card-animation-layer');
  console.log(`Animation layer found: ${animationLayer ? 'YES' : 'NO'}`);
  
  // Override console methods to catch animation-related logs
  console.log('\n4. MONITORING ANIMATION CALLS:');
  console.log('Setting up animation call monitoring...');
  
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  let animationWarnings = [];
  let animationLogs = [];
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('Animation context not available') || 
        message.includes('DOM elements not found') ||
        message.includes('Draw animation failed')) {
      animationWarnings.push(message);
      originalWarn('🚨 ANIMATION WARNING:', ...args);
    } else {
      originalWarn.apply(console, args);
    }
  };
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('triggerMultipleDrawAnimations') || 
        message.includes('drawService') ||
        message.includes('Starting animation')) {
      animationLogs.push(message);
      originalLog('📝 ANIMATION LOG:', ...args);
    } else {
      originalLog.apply(console, args);
    }
  };
  
  // Instructions for testing
  console.log('\n5. TESTING INSTRUCTIONS:');
  console.log('Now perform these actions to test animations:');
  console.log('a) Start a new game (should trigger initial card dealing)');
  console.log('b) Play cards until your hand is empty (should trigger hand refill)');
  console.log('c) Let AI play until it empties its hand');
  console.log('d) Watch console for animation warnings and logs');
  
  // Restore console methods after 60 seconds
  setTimeout(() => {
    console.warn = originalWarn;
    console.log = originalLog;
    
    console.log('\n6. MONITORING RESULTS:');
    console.log(`Animation warnings captured: ${animationWarnings.length}`);
    console.log(`Animation logs captured: ${animationLogs.length}`);
    
    if (animationWarnings.length > 0) {
      console.log('\n❌ ANIMATION WARNINGS:');
      animationWarnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (animationLogs.length > 0) {
      console.log('\n📝 ANIMATION LOGS:');
      animationLogs.forEach(log => console.log(`  - ${log}`));
    }
    
    if (animationWarnings.length === 0 && animationLogs.length === 0) {
      console.log('❌ NO ANIMATION ACTIVITY DETECTED - Functions may not be called at all');
    }
    
    console.log('\nMonitoring disabled. Check results above.');
  }, 60000);
  
  console.log('\n✅ Debug monitoring active for 60 seconds');
}

// Run the debug function
debugDeckToHandAnimations();