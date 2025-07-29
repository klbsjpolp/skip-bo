// Debug script to identify why cards don't appear immediately after their animations complete
// This can be run in the browser console when the game is loaded

function debugCardAppearance() {
  console.log('🔍 DEBUGGING CARD APPEARANCE TIMING');
  console.log('==================================');
  
  // Check if the game UI is loaded
  const playerAreas = document.querySelectorAll('.player-area');
  const centerArea = document.querySelector('.center-area');
  const animationLayer = document.querySelector('.card-animation-layer');
  
  console.log('\n1. DOM ELEMENT DETECTION:');
  console.log(`Player areas found: ${playerAreas.length}`);
  console.log(`Center area found: ${centerArea ? 'YES' : 'NO'}`);
  console.log(`Animation layer found: ${animationLayer ? 'YES' : 'NO'}`);
  
  // Track animation events with timestamps
  const animationEvents = [];
  
  // Override console methods to catch animation-related logs
  console.log('\n2. SETTING UP ANIMATION EVENT TRACKING:');
  
  const originalLog = console.log;
  
  console.log = function(...args) {
    const message = args.join(' ');
    const timestamp = Date.now();
    
    // Track animation start events
    if (message.includes('🎬 Card') && message.includes('animation STARTING')) {
      const cardInfo = message.match(/Card (\d+)\/(\d+) animation STARTING - Card: (\d+)/);
      if (cardInfo) {
        const [_, cardNumber, totalCards, cardValue] = cardInfo;
        animationEvents.push({
          type: 'start',
          cardNumber: parseInt(cardNumber),
          totalCards: parseInt(totalCards),
          cardValue: parseInt(cardValue),
          timestamp,
          message
        });
      }
      originalLog('🔄 TRACKED START:', ...args);
    }
    // Track animation in progress events
    else if (message.includes('⏱️ Card') && message.includes('animation IN PROGRESS')) {
      const cardInfo = message.match(/Card (\d+)\/(\d+) animation IN PROGRESS/);
      if (cardInfo) {
        const [_, cardNumber, totalCards] = cardInfo;
        animationEvents.push({
          type: 'progress',
          cardNumber: parseInt(cardNumber),
          totalCards: parseInt(totalCards),
          timestamp,
          message
        });
      }
      originalLog('⏱️ TRACKED PROGRESS:', ...args);
    }
    // Track animation finish events
    else if (message.includes('✅ Card') && message.includes('animation FINISHED')) {
      const cardInfo = message.match(/Card (\d+)\/(\d+) animation FINISHED - Card: (\d+)/);
      if (cardInfo) {
        const [_, cardNumber, totalCards, cardValue] = cardInfo;
        animationEvents.push({
          type: 'finish',
          cardNumber: parseInt(cardNumber),
          totalCards: parseInt(totalCards),
          cardValue: parseInt(cardValue),
          timestamp,
          message
        });
      }
      originalLog('✅ TRACKED FINISH:', ...args);
    }
    // Track all animations completed event
    else if (message.includes('🏁 All animations completed')) {
      animationEvents.push({
        type: 'all_complete',
        timestamp,
        message
      });
      originalLog('🏁 TRACKED ALL COMPLETE:', ...args);
    }
    // Track useSkipBoGame waiting event
    else if (message.includes('⏳ useSkipBoGame: Waiting additional')) {
      animationEvents.push({
        type: 'game_waiting',
        timestamp,
        message
      });
      originalLog('⏳ TRACKED GAME WAITING:', ...args);
    }
    // Track useSkipBoGame wait complete event
    else if (message.includes('✅ useSkipBoGame: Wait complete')) {
      animationEvents.push({
        type: 'game_proceed',
        timestamp,
        message
      });
      originalLog('✅ TRACKED GAME PROCEED:', ...args);
    }
    else {
      originalLog.apply(console, args);
    }
  };
  
  // Instructions for testing
  console.log('\n3. TESTING INSTRUCTIONS:');
  console.log('Perform these actions to test card appearance timing:');
  console.log('a) Start a new game (should trigger initial card dealing)');
  console.log('b) Play cards until your hand is empty (should trigger hand refill)');
  console.log('c) Watch for when cards visually appear on screen');
  console.log('d) Compare visual appearance with console logs');
  
  // Analyze results after 60 seconds
  setTimeout(() => {
    console.log = originalLog;
    
    console.log('\n4. ANIMATION EVENT ANALYSIS:');
    console.log('==========================');
    
    if (animationEvents.length === 0) {
      console.log('❌ No animation events detected. Try again and make sure to empty your hand.');
      return;
    }
    
    // Group events by card number
    const cardEvents = {};
    const otherEvents = [];
    
    animationEvents.forEach(event => {
      if (['start', 'progress', 'finish'].includes(event.type)) {
        const key = `card_${event.cardNumber}`;
        cardEvents[key] = cardEvents[key] || [];
        cardEvents[key].push(event);
      } else {
        otherEvents.push(event);
      }
    });
    
    // Analyze timing for each card
    console.log('\n5. CARD-BY-CARD TIMING ANALYSIS:');
    
    Object.keys(cardEvents).forEach(cardKey => {
      const events = cardEvents[cardKey];
      const startEvent = events.find(e => e.type === 'start');
      const finishEvent = events.find(e => e.type === 'finish');
      
      if (startEvent && finishEvent) {
        const animationDuration = finishEvent.timestamp - startEvent.timestamp;
        console.log(`Card ${startEvent.cardNumber}/${startEvent.totalCards} (Value: ${startEvent.cardValue}):`);
        console.log(`  - Started at: ${new Date(startEvent.timestamp).toLocaleTimeString()}.${startEvent.timestamp % 1000}`);
        console.log(`  - Finished at: ${new Date(finishEvent.timestamp).toLocaleTimeString()}.${finishEvent.timestamp % 1000}`);
        console.log(`  - Animation duration: ${animationDuration}ms`);
      }
    });
    
    // Analyze overall timing
    console.log('\n6. OVERALL ANIMATION TIMING:');
    
    const firstStart = animationEvents.find(e => e.type === 'start');
    const lastFinish = [...animationEvents].reverse().find(e => e.type === 'finish');
    const allComplete = animationEvents.find(e => e.type === 'all_complete');
    const gameWaiting = animationEvents.find(e => e.type === 'game_waiting');
    const gameProceed = animationEvents.find(e => e.type === 'game_proceed');
    
    if (firstStart && lastFinish) {
      const totalAnimationTime = lastFinish.timestamp - firstStart.timestamp;
      console.log(`First animation started at: ${new Date(firstStart.timestamp).toLocaleTimeString()}.${firstStart.timestamp % 1000}`);
      console.log(`Last animation finished at: ${new Date(lastFinish.timestamp).toLocaleTimeString()}.${lastFinish.timestamp % 1000}`);
      console.log(`Total animation time: ${totalAnimationTime}ms`);
      
      if (allComplete) {
        const allCompleteDelay = allComplete.timestamp - lastFinish.timestamp;
        console.log(`All animations completed at: ${new Date(allComplete.timestamp).toLocaleTimeString()}.${allComplete.timestamp % 1000}`);
        console.log(`Delay between last finish and all complete: ${allCompleteDelay}ms`);
      }
      
      if (gameWaiting && gameProceed) {
        const gameWaitDuration = gameProceed.timestamp - gameWaiting.timestamp;
        console.log(`Game started waiting at: ${new Date(gameWaiting.timestamp).toLocaleTimeString()}.${gameWaiting.timestamp % 1000}`);
        console.log(`Game proceeded at: ${new Date(gameProceed.timestamp).toLocaleTimeString()}.${gameProceed.timestamp % 1000}`);
        console.log(`Game wait duration: ${gameWaitDuration}ms`);
      }
    }
    
    // Provide analysis of the issue
    console.log('\n7. ISSUE ANALYSIS:');
    
    if (firstStart && lastFinish && allComplete && gameWaiting && gameProceed) {
      const lastFinishToGameProceed = gameProceed.timestamp - lastFinish.timestamp;
      
      console.log(`Time between last card finish and game proceeding: ${lastFinishToGameProceed}ms`);
      
      if (lastFinishToGameProceed > 100) {
        console.log('❌ ISSUE DETECTED: There is a significant delay between when the last card animation');
        console.log('   finishes and when the game proceeds. This suggests that cards may not be appearing');
        console.log('   until the game proceeds, even though their animations have completed.');
        
        console.log('\n🔍 POTENTIAL CAUSES:');
        console.log('1. removeAnimation is not making cards appear immediately');
        console.log('2. Cards are being hidden until the game state updates');
        console.log('3. The Promise.all and additional wait in useSkipBoGame is causing the delay');
        
        console.log('\n💡 SUGGESTED FIX:');
        console.log('- Modify triggerMultipleDrawAnimations to not wait for all animations to complete');
        console.log('- Return 0 as the duration so useSkipBoGame doesn\'t wait additionally');
        console.log('- Let each card appear independently when its animation completes');
      } else {
        console.log('✅ NO ISSUE DETECTED: Cards appear to be finishing their animations and the game');
        console.log('   is proceeding without significant delay. If cards are not appearing when expected,');
        console.log('   the issue may be elsewhere.');
      }
    } else {
      console.log('❓ INCOMPLETE DATA: Not all required events were captured. Try testing again.');
    }
    
    console.log('\nDebug monitoring complete! 🏁');
  }, 60000);
  
  console.log('\n✅ Debug monitoring active for 60 seconds - start testing now!');
}

// Run the debug function
debugCardAppearance();