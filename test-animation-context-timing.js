// Test script to check if there's a timing issue with the global animation context
// This can be run in the browser console when the game is loaded

function testAnimationContextTiming() {
  console.log('🕐 TESTING ANIMATION CONTEXT TIMING');
  console.log('===================================');
  
  // Check if the game is loaded
  const playerAreas = document.querySelectorAll('.player-area');
  const centerArea = document.querySelector('.center-area');
  const animationLayer = document.querySelector('.card-animation-layer');
  
  console.log('\n1. BASIC SETUP CHECK:');
  console.log(`Player areas: ${playerAreas.length}`);
  console.log(`Center area: ${centerArea ? 'FOUND' : 'MISSING'}`);
  console.log(`Animation layer: ${animationLayer ? 'FOUND' : 'MISSING'}`);
  console.log(`Deck element: ${centerArea?.querySelector('.deck') ? 'FOUND' : 'MISSING'}`);
  
  // Add debugging to the global animation context
  console.log('\n2. MONITORING GLOBAL CONTEXT SETUP:');
  
  // Override the setGlobalDrawAnimationContext function to track when it's called
  let contextSetupTime = null;
  let contextSetupCount = 0;
  
  // We can't directly access the module, but we can monitor console output
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  let contextWarnings = [];
  let drawServiceCalls = [];
  let animationAttempts = [];
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('Animation context not available')) {
      contextWarnings.push({
        time: Date.now(),
        message: message
      });
      originalWarn('🚨 CONTEXT WARNING:', ...args);
    } else {
      originalWarn.apply(console, args);
    }
  };
  
  // Monitor for draw service calls and animation attempts
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('drawService') || message.includes('triggerMultiple')) {
      drawServiceCalls.push({
        time: Date.now(),
        message: message
      });
      originalError('📝 DRAW SERVICE:', ...args);
    } else {
      originalError.apply(console, args);
    }
  };
  
  // Try to detect when React components mount
  console.log('\n3. REACT COMPONENT MONITORING:');
  
  // Check if we can detect React DevTools or component mounting
  let reactMountDetected = false;
  const checkReactMount = () => {
    const root = document.getElementById('root');
    if (root && root._reactInternalFiber) {
      reactMountDetected = true;
      console.log('✅ React components appear to be mounted');
    } else if (root && root._reactInternalInstance) {
      reactMountDetected = true;
      console.log('✅ React components appear to be mounted (legacy)');
    } else {
      console.log('⏳ React components may still be mounting...');
    }
  };
  
  checkReactMount();
  
  // Check periodically for React mount
  const mountCheckInterval = setInterval(() => {
    if (!reactMountDetected) {
      checkReactMount();
    } else {
      clearInterval(mountCheckInterval);
    }
  }, 100);
  
  console.log('\n4. TESTING INSTRUCTIONS:');
  console.log('Now perform these actions:');
  console.log('a) Start a new game immediately');
  console.log('b) Watch for context warnings vs draw service calls');
  console.log('c) Note the timing of when warnings occur');
  
  // Report results after 30 seconds
  setTimeout(() => {
    console.warn = originalWarn;
    console.log = originalLog;
    console.error = originalError;
    clearInterval(mountCheckInterval);
    
    console.log('\n5. TIMING ANALYSIS RESULTS:');
    console.log(`Context warnings: ${contextWarnings.length}`);
    console.log(`Draw service calls: ${drawServiceCalls.length}`);
    
    if (contextWarnings.length > 0) {
      console.log('\n❌ CONTEXT WARNINGS DETECTED:');
      contextWarnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${new Date(warning.time).toLocaleTimeString()}] ${warning.message}`);
      });
      
      console.log('\n💡 DIAGNOSIS: Global animation context is not available when needed');
      console.log('   This suggests a timing issue where drawService runs before useEffect sets up the context');
    }
    
    if (drawServiceCalls.length > 0) {
      console.log('\n📝 DRAW SERVICE CALLS:');
      drawServiceCalls.forEach((call, index) => {
        console.log(`  ${index + 1}. [${new Date(call.time).toLocaleTimeString()}] ${call.message}`);
      });
    }
    
    if (contextWarnings.length === 0 && drawServiceCalls.length === 0) {
      console.log('❓ NO ACTIVITY DETECTED - Functions may not be called at all');
      console.log('   Try starting a new game or playing cards to trigger animations');
    }
    
    // Provide specific recommendations
    console.log('\n🔧 RECOMMENDATIONS:');
    if (contextWarnings.length > 0) {
      console.log('- Add a delay or check in drawService before calling triggerMultipleDrawAnimations');
      console.log('- Ensure global context is set up before state machine starts');
      console.log('- Consider using a different approach for context sharing');
    } else {
      console.log('- Context timing appears OK, check other potential issues');
      console.log('- Verify DOM elements are available when animations trigger');
    }
    
    console.log('\nMonitoring complete.');
  }, 30000);
  
  console.log('\n✅ Timing analysis active for 30 seconds');
}

// Run the test
testAnimationContextTiming();