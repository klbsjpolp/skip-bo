import { createMachine, assign, fromPromise } from 'xstate';
import { gameReducer } from './gameReducer';
import { GameAction } from './gameActions';
import { initialGameState } from './initialGameState';
import { computeBestMove } from '@/ai/computeBestMove';
import { GameState, Card } from '@/types';
import { triggerAIAnimation } from '@/services/aiAnimationService';
import { triggerMultipleDrawAnimations } from '@/services/drawAnimationService';

// Helper function to check if a PLAY_CARD action will result in an empty hand
const willPlayCardEmptyHand = (gameState: GameState): boolean => {
  if (!gameState.selectedCard || gameState.selectedCard.source !== 'hand') {
    return false;
  }
  
  const player = gameState.players[gameState.currentPlayerIndex];
  const handAfterPlay = [...player.hand];
  handAfterPlay[gameState.selectedCard.index] = null;
  
  return handAfterPlay.every(card => card === null);
};

export const gameMachine = createMachine({
  id: 'skipbo',
  context: { G: initialGameState() },
  initial: 'setup',
  states: {
    setup: {
      always: [
        { target: 'botTurn', guard: 'isAITurn' },
        { target: 'humanTurn' }
      ],
    },

    humanTurn: {
      initial: 'drawing',
      states: {
        drawing: {
          invoke: {
            src: 'drawService',
            input: ({ context }) => ({ G: context.G }),
            onDone: {
              actions: 'applyDraw',
              target: 'ready',
            },
          },
        },
        ready: {
          always: [
            { target: '#skipbo.finished', guard: 'hasWinner' },
            { target: '#skipbo.botTurn', guard: 'isAITurn' },
          ],
          on: {
            INIT: {
              actions: 'apply',
              target: '#skipbo.setup'
            },
            SELECT_CARD: {
              actions: 'apply',
              guard: 'isHumanAction',
            },
            CLEAR_SELECTION: {
              actions: 'apply',
              guard: 'isHumanAction',
            },
            PLAY_CARD: {
              actions: 'apply',
              guard: 'isHumanAction',
            },
            DISCARD_CARD: {
              actions: 'apply',
              guard: 'isHumanAction',
            },
            END_TURN: {
              actions: 'apply',
              target: '#skipbo.botTurn',
            },
            RESET: {
              actions: 'apply',
              target: '#skipbo.setup'
            },
          },
        },
      },
    },

    botTurn: {
      initial: 'drawing',
      states: {
        drawing: {
          invoke: {
            src: 'drawService',
            input: ({ context }) => ({ G: context.G }),
            onDone: {
              actions: 'applyDraw',
              target: 'ready',
            },
          },
        },
        ready: {
          always: [
            { target: '#skipbo.finished', guard: 'hasWinner' },
            { target: '#skipbo.humanTurn', guard: 'isHumanTurn' },
            { target: 'thinking' }
          ],
        },
        thinking: {
          invoke: {
            src: 'botService',
            input: ({ context }) => ({ G: context.G }),
            onDone: {
              actions: ['applyBot', 'logAIAction'],
              target: 'checkState',
            },
          },
        },
        checkState: {
          always: [
            { target: '#skipbo.finished', guard: 'hasWinner' },
            { target: '#skipbo.humanTurn', guard: 'isHumanTurn' },
            { target: 'thinking' }
          ]
        }
      }
    },

    finished: { 
      on: {
        INIT: {
          target: 'setup',
          actions: 'apply'
        },
        RESET: {
          target: 'setup',
          actions: 'apply'
        }
      }
    },
  },
}, {
  actions: {
    apply: assign({ 
      G: ({ context, event }) => {
        if (event && typeof event === 'object' && 'type' in event) {
          return gameReducer(context.G, event as GameAction);
        }
        return context.G;
      }
    }),
    applyBot: assign({ 
      G: ({ context, event }) => {
        if (event && typeof event === 'object' && 'output' in event) {
          const action = (event as unknown as { output: GameAction }).output;
          return gameReducer(context.G, action);
        }
        return context.G;
      }
    }),
    logAIAction: () => {
      // No-op in production, can be used for debugging if needed
    },
    applyDraw: assign({ 
      G: ({ context, event }) => {
        if (event && typeof event === 'object' && 'output' in event) {
          const action = (event as unknown as { output: GameAction }).output;
          return gameReducer(context.G, action);
        }
        return context.G;
      }
    }),
  },
  guards: {
    isHumanAction: ({ context }) => !context.G.players[context.G.currentPlayerIndex].isAI,
    isAITurn: ({ context }) => context.G.players[context.G.currentPlayerIndex].isAI && !context.G.gameIsOver,
    isHumanTurn: ({ context }) => !context.G.players[context.G.currentPlayerIndex].isAI || context.G.gameIsOver,
    hasWinner: ({ context }) => context.G.gameIsOver,
    // New guard specifically for END_TURN that checks the current player before switching
    isHumanEndTurn: ({ context }) => !context.G.players[context.G.currentPlayerIndex].isAI,
    aiNeedsDraw: ({ context }) => {
      if (!context?.G || !Array.isArray(context.G.players)) return false;
      const aiPlayer = context.G.players[context.G.currentPlayerIndex];
      if (!aiPlayer?.isAI || !Array.isArray(aiPlayer.hand)) return false;

      const emptySlots = aiPlayer.hand.filter((c) => c === null).length;

      // AI needs to draw if it has empty slots and there are cards available to draw
      return emptySlots > 0 && (context.G.deck.length > 0 || context.G.completedBuildPiles.length > 0);
    },
  },
  actors: {
    botService: fromPromise(async ({ input }: { input: { G: GameState } }) => {
      const action = await computeBestMove(input.G);
      
      // Check if PLAY_CARD will empty the hand and trigger draw animations
      if (action.type === 'PLAY_CARD' && willPlayCardEmptyHand(input.G)) {
        // First trigger the play card animation
        if (input.G.selectedCard) {
          const playAnimationDuration = await triggerAIAnimation(input.G, action);
          if (playAnimationDuration > 0) {
            await new Promise(resolve => setTimeout(resolve, playAnimationDuration));
          }
        }
        
        // Then trigger draw animations for the hand refill
        const gameStateAfterPlay = { ...input.G };
        const player = gameStateAfterPlay.players[gameStateAfterPlay.currentPlayerIndex];
        
        // Simulate the hand becoming empty
        if (gameStateAfterPlay.selectedCard?.source === 'hand') {
          const handCopy = [...player.hand];
          handCopy[gameStateAfterPlay.selectedCard.index] = null;
          
          // Calculate cards that will be drawn (same logic as in gameReducer)
          const emptySlots = handCopy.filter(card => card === null).length;
          const cardsToDraw = Math.min(emptySlots, gameStateAfterPlay.deck.length + gameStateAfterPlay.completedBuildPiles.length);
          
          if (cardsToDraw > 0) {
            const cardsToAnimate: Card[] = [];
            const handIndices: number[] = [];
            
            // Simulate the draw to get the cards that will be drawn
            let remainingToDraw = cardsToDraw;
            const deckCopy = [...gameStateAfterPlay.deck];
            const completedBuildPilesCopy = [...gameStateAfterPlay.completedBuildPiles];
            
            // First, get cards from existing deck
            for (let i = 0; i < handCopy.length && remainingToDraw > 0; i++) {
              if (handCopy[i] === null && deckCopy.length > 0) {
                cardsToAnimate.push(deckCopy.shift()!);
                handIndices.push(i);
                remainingToDraw--;
              }
            }
            
            // If we need more cards and have completed build piles, reshuffle
            if (remainingToDraw > 0 && completedBuildPilesCopy.length > 0) {
              deckCopy.push(...completedBuildPilesCopy);

              // Shuffle deck
              for (let i = deckCopy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
              }
              
              // Get remaining cards
              for (let i = 0; i < handCopy.length && remainingToDraw > 0; i++) {
                if (handCopy[i] === null && deckCopy.length > 0) {
                  cardsToAnimate.push(deckCopy.shift()!);
                  handIndices.push(i);
                  remainingToDraw--;
                }
              }
            }
            
            // Trigger draw animations
            if (cardsToAnimate.length > 0) {
              const drawAnimationDuration = await triggerMultipleDrawAnimations(
                gameStateAfterPlay,
                gameStateAfterPlay.currentPlayerIndex,
                cardsToAnimate,
                handIndices,
                150 // 150ms stagger between cards
              );
              
              // Wait for draw animations to complete
              if (drawAnimationDuration > 0) {
                await new Promise(resolve => setTimeout(resolve, drawAnimationDuration));
              }
            }
          }
        }
      } else {
        // Trigger animation for other AI actions that need it
        if ((action.type === 'PLAY_CARD' || action.type === 'DISCARD_CARD') && input.G.selectedCard) {
          const animationDuration = await triggerAIAnimation(input.G, action);
          
          // Wait for animation to complete before returning the action
          if (animationDuration > 0) {
            await new Promise(resolve => setTimeout(resolve, animationDuration));
          }
        }
      }
      
      return action;
    }),
    drawService: fromPromise(async ({ input }: { input: { G: GameState } }) => {
      const gameState = input.G;
      const player = gameState.players[gameState.currentPlayerIndex];
      // Count empty slots in hand (null values)
      const emptySlots = player.hand.filter(card => card === null).length;
      // Calculate how many cards will be drawn
      const cardsToDraw = Math.min(emptySlots, gameState.deck.length + gameState.completedBuildPiles.length);
      
      if (cardsToDraw > 0) {
        // Prepare cards and hand indices for animation
        const cardsToAnimate: Card[] = [];
        const handIndices: number[] = [];

        // Simulate the draw to get the cards that will be drawn
        let remainingToDraw = cardsToDraw;
        const deckCopy = [...gameState.deck];
        const completedBuildPilesCopy = [...gameState.completedBuildPiles];

        // First, get cards from existing deck
        for (let i = 0; i < player.hand.length && remainingToDraw > 0; i++) {
          if (player.hand[i] === null && deckCopy.length > 0) {
            cardsToAnimate.push(deckCopy.shift()!);
            handIndices.push(i);
            remainingToDraw--;
          }
        }

        // If we need more cards and have completed build piles, reshuffle
        if (remainingToDraw > 0 && completedBuildPilesCopy.length > 0) {
          // Add completed build piles to deck and shuffle
          deckCopy.push(...completedBuildPilesCopy);

          // Shuffle deck
          for (let i = deckCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
          }

          // Get remaining cards
          for (let i = 0; i < player.hand.length && remainingToDraw > 0; i++) {
            if (player.hand[i] === null && deckCopy.length > 0) {
              cardsToAnimate.push(deckCopy.shift()!);
              handIndices.push(i);
              remainingToDraw--;
            }
          }
        }

        // Trigger animations if we have cards to animate
        if (cardsToAnimate.length > 0) {
          const animationDuration = await triggerMultipleDrawAnimations(
            gameState,
            gameState.currentPlayerIndex,
            cardsToAnimate,
            handIndices,
            150 // 150ms stagger between cards
          );

          // Wait for animations to complete
          if (animationDuration > 0) {
            await new Promise(resolve => setTimeout(resolve, animationDuration));
          }
        }
      }
      
      return { type: 'DRAW', count: cardsToDraw } as GameAction;
    }),
  },
});

