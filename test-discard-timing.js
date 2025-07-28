// Test script to verify discard animation timing
// This can be run in the browser console when the game is loaded

function testDiscardTiming() {
  console.log('Testing discard animation timing...');
  
  // Mock the animation system to track timing
  let animationStartTime = null;
  let stateChangeTime = null;
  
  // Override console.log to capture timing information
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Starting animation') && message.includes('discard')) {
      animationStartTime = Date.now();
      originalLog('Animation started at:', animationStartTime);
    } else if (message.includes('IA joue maintenant') || message.includes('AI plays now')) {
      stateChangeTime = Date.now();
      if (animationStartTime) {
        const delay = stateChangeTime - animationStartTime;
        originalLog('State changed at:', stateChangeTime, 'Delay:', delay + 'ms');
        if (delay >= 300) { // Minimum animation duration
          originalLog('✅ PASS: AI waited for animation to complete');
        } else {
          originalLog('❌ FAIL: AI started too early');
        }
      }
    }
    originalLog.apply(console, args);
  };
  
  // Instructions for manual testing
  console.log('Manual test instructions:');
  console.log('1. Start a game');
  console.log('2. Select a card from your hand');
  console.log('3. Discard it to a discard pile');
  console.log('4. Watch the console for timing information');
  console.log('5. The AI should wait for the animation to complete before starting its turn');
  
  // Restore original console.log after 30 seconds
  setTimeout(() => {
    console.log = originalLog;
    console.log('Test monitoring disabled');
  }, 30000);
}

// Run the test
testDiscardTiming();