import { createMachine, assign, fromPromise } from 'xstate';
import { gameReducer } from './gameReducer';
import { GameAction } from './gameActions';
import { initialGameState } from './initialGameState';
import { computeBestMove } from '@/ai/computeBestMove';
import { GameState } from '@/types';

export const gameMachine = createMachine({
  id: 'skipbo',
  context: { G: initialGameState() },
  initial: 'setup',
  states: {
    setup: {
      always: {
        target: 'humanTurn',
        actions: assign({ G: () => initialGameState() }),
      },
    },

    humanTurn: {
      entry: 'draw',
      always: [
        { target: 'finished', guard: 'hasWinner' },
        { target: 'botTurn', guard: 'isAITurn' },
      ],
      on: {
        INIT: {
          actions: 'apply',
          target: 'setup'
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
          target: 'botTurn',
          guard: 'isHumanAction',
        },
        RESET: {
          actions: 'apply',
          target: 'setup'
        },
      },
    },

    botTurn: {
      entry: 'DRAW',
      always: [
        { target: 'finished', guard: 'hasWinner' },
        { target: 'humanTurn', guard: 'isHumanTurn' },
      ],
      initial: 'thinking',
      states: {
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
      type: 'final',
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
          const action = (event as any).output;
          return gameReducer(context.G, action);
        }
        return context.G;
      }
    }),
    logAIAction: () => {
      // No-op in production, can be used for debugging if needed
    },
    draw: assign({
      G: ({ context }) => {
        // Call reducer with DRAW event
        return gameReducer(context.G, { type: 'DRAW' });
      }
    }),
  },
  guards: {
    isHumanAction: ({ context }) => !context.G.players[context.G.currentPlayerIndex].isAI,
    isAITurn: ({ context }) => context.G.players[context.G.currentPlayerIndex].isAI && !context.G.gameIsOver,
    isHumanTurn: ({ context }) => !context.G.players[context.G.currentPlayerIndex].isAI || context.G.gameIsOver,
    hasWinner: ({ context }) => context.G.gameIsOver,
  },
  actors: {
    botService: fromPromise(async ({ input }: { input: { G: GameState } }) => {
      return computeBestMove(input.G);
    }),
  },
});