import { assign, createMachine, fromPromise } from 'xstate';
import {
  gameReducer,
  getCompletedBuildPileCards,
  initialGameState,
  planPostPlayRefill,
  planStartOfTurnDraw,
  willPlayCardEmptyHand,
  type Card,
  type GameAction,
  type GameState,
} from '@skipbo/game-core';
import { computeBestMove } from '@/ai/computeBestMove';
import { triggerAIAnimation } from '@/services/aiAnimationService';
import { triggerCompletedBuildPileAnimation } from '@/services/completedBuildPileAnimationService';
import { triggerMultipleDrawAnimations } from '@/services/drawAnimationService';
import { animationGate } from '@/services/animationGate';
import { animationServiceBridge } from '@/lib/animationServiceBridge.ts';

/**
 * Machine event envelope: a rules action plus the presentation-only
 * animation hint. `animationDuration` is a web-layer concern and rides on the
 * event, never on the `GameAction` itself (game-core stays presentation-free).
 */
export type LocalGameEvent = GameAction & { animationDuration?: number };

export const gameMachine = createMachine(
  {
    id: 'skipbo',
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    types: {} as unknown as {
      context: {
        G: GameState;
        animationDuration: number;
      };
      events: LocalGameEvent;
    },
    context: () => ({
      G: initialGameState(),
      animationDuration: 0,
    }),
    on: {
      DEBUG_WIN: {
        actions: 'apply',
        target: '.finished',
      },
    },
    initial: 'setup',
    states: {
      setup: {
        always: [{ target: 'botTurn', guard: 'isAITurn' }, { target: 'humanTurn' }],
      },

      humanTurn: {
        initial: 'drawing',
        states: {
          drawing: {
            invoke: {
              src: 'drawService',
              input: ({ context }) => ({ G: context.G }),
              onDone: {
                actions: 'applyDrawAndStoreAnimation',
                target: 'drawAnimating',
              },
            },
          },
          drawAnimating: {
            invoke: {
              src: 'animationGate',
              input: ({ context }) => ({ duration: context.animationDuration }),
              onDone: {
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
                target: '#skipbo.setup',
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
                actions: 'applyAndStoreAnimation',
                target: 'humanActionAnimating',
                guard: 'isHumanAction',
              },
              DISCARD_CARD: {
                actions: 'applyAndStoreAnimation',
                target: 'humanActionAnimating',
                guard: 'isHumanAction',
              },
              END_TURN: {
                actions: 'apply',
                target: '#skipbo.botTurn',
              },
              DEBUG_FILL_BUILD_PILE: {
                actions: 'apply',
                guard: 'isHumanAction',
              },
              DEBUG_FILL_HAND_SKIPBO: {
                actions: 'apply',
                guard: 'isHumanAction',
              },
              DEBUG_CLEAR_STOCK_PILE: {
                actions: 'apply',
                guard: 'isHumanAction',
              },
              DEBUG_CLEAR_AI_STOCK_PILE: {
                // Reducer empties the AI stock to a single Skip-Bo and hands the
                // turn to the AI; route into botTurn so it plays that card and wins.
                actions: 'apply',
                target: '#skipbo.botTurn',
              },
              RESET: {
                actions: 'apply',
                target: '#skipbo.setup',
              },
            },
          },
          humanActionAnimating: {
            // Allow further human actions while animations are still in flight.
            // The animationGate keeps waiting on `waitForAnimations()`, which
            // covers any animation queued during this state. We deliberately omit
            // `target` on PLAY_CARD/DISCARD_CARD/SELECT_CARD/CLEAR_SELECTION so
            // xstate v5 doesn't re-invoke `animationGate` on every chained action
            // (a re-invoke would cancel the in-flight gate and reset the
            // minimum-duration timer).
            on: {
              SELECT_CARD: {
                actions: 'apply',
                guard: 'isHumanAction',
              },
              CLEAR_SELECTION: {
                actions: 'apply',
                guard: 'isHumanAction',
              },
              PLAY_CARD: {
                actions: 'applyAndStoreAnimation',
                guard: 'isHumanAction',
              },
              DISCARD_CARD: {
                actions: 'applyAndStoreAnimation',
                guard: 'isHumanAction',
              },
            },
            invoke: {
              src: 'animationGate',
              input: ({ context }) => ({ duration: context.animationDuration }),
              onDone: {
                target: 'ready',
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
                actions: 'applyDrawAndStoreAnimation',
                target: 'drawAnimating',
              },
            },
          },
          drawAnimating: {
            invoke: {
              src: 'animationGate',
              input: ({ context }) => ({ duration: context.animationDuration }),
              onDone: {
                target: 'ready',
              },
            },
          },
          ready: {
            always: [
              { target: '#skipbo.finished', guard: 'hasWinner' },
              { target: '#skipbo.humanTurn', guard: 'isHumanTurn' },
              { target: 'thinking' },
            ],
          },
          thinking: {
            invoke: {
              src: 'botService',
              input: ({ context }) => ({ G: context.G }),
              onDone: {
                actions: 'applyBotAndStoreAnimation',
                target: 'animating',
              },
            },
          },
          animating: {
            invoke: {
              src: 'animationGate',
              input: ({ context }) => ({ duration: context.animationDuration }),
              onDone: {
                target: 'checkState',
              },
            },
          },
          checkState: {
            always: [
              { target: '#skipbo.finished', guard: 'hasWinner' },
              { target: '#skipbo.humanTurn', guard: 'isHumanTurn' },
              { target: 'thinking' },
            ],
          },
        },
      },

      finished: {
        on: {
          INIT: {
            target: 'setup',
            actions: 'apply',
          },
          RESET: {
            target: 'setup',
            actions: 'apply',
          },
        },
      },
    },
  },
  {
    actions: {
      apply: assign({
        G: ({ context, event }) => {
          if (event && typeof event === 'object' && 'type' in event) {
            return gameReducer(context.G, event);
          }
          return context.G;
        },
      }),
      applyBot: assign({
        G: ({ context, event }) => {
          if (event && typeof event === 'object' && 'output' in event) {
            const {
              output: { action },
            } = event as unknown as { output: { action: GameAction; animationDuration: number } };
            return gameReducer(context.G, action);
          }
          return context.G;
        },
      }),
      applyBotAndStoreAnimation: assign({
        G: ({ context, event }) => {
          if (event && typeof event === 'object' && 'output' in event) {
            const { action } = (event as unknown as { output: { action: GameAction; animationDuration: number } })
              .output;
            return gameReducer(context.G, action);
          }
          return context.G;
        },
        animationDuration: ({ event }) => {
          if (event && typeof event === 'object' && 'output' in event) {
            const { animationDuration } = (
              event as unknown as { output: { action: GameAction; animationDuration: number } }
            ).output;
            return animationDuration;
          }
          return 0;
        },
      }),
      applyAndStoreAnimation: assign({
        G: ({ context, event }) => {
          if (event && typeof event === 'object' && 'type' in event) {
            return gameReducer(context.G, event);
          }
          return context.G;
        },
        animationDuration: ({ event }) => event.animationDuration ?? 0,
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
        },
      }),
      applyDrawAndStoreAnimation: assign({
        G: ({ context, event }) => {
          if (event && typeof event === 'object' && 'output' in event) {
            const action = (event as unknown as { output: GameAction }).output;
            return gameReducer(context.G, action);
          }
          return context.G;
        },
        animationDuration: ({ event }) => {
          if (event && typeof event === 'object' && 'output' in event) {
            const { animationDuration } = (event as unknown as { output: { animationDuration: number } }).output;
            return animationDuration;
          }
          return 0;
        },
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
      animationGate,
      botService: fromPromise(async ({ input }: { input: { G: GameState } }) => {
        const action = await computeBestMove(input.G);
        const completedBuildPileCards =
          action.type === 'PLAY_CARD' ? getCompletedBuildPileCards(input.G, action.buildPile) : null;
        let animationDuration = 0;

        // Check if PLAY_CARD will empty the hand and trigger draw animations
        if (action.type === 'PLAY_CARD' && willPlayCardEmptyHand(input.G)) {
          // First trigger the play card animation. triggerAIAnimation is
          // synchronous — the actual wait happens via waitForAnimations().
          if (input.G.selectedCard) {
            triggerAIAnimation(input.G, action);
            await animationServiceBridge.waitForAnimations();
          }

          const completionAnimationDuration =
            action.type === 'PLAY_CARD' && completedBuildPileCards
              ? triggerCompletedBuildPileAnimation(
                  input.G,
                  action.buildPile,
                  completedBuildPileCards,
                  input.G.completedBuildPiles.length,
                )
              : 0;

          animationDuration = completionAnimationDuration;

          // Then trigger draw animations for the hand refill.
          if (input.G.selectedCard?.source === 'hand') {
            const { cards, handIndices } = planPostPlayRefill(input.G);

            if (cards.length > 0) {
              animationDuration = Math.max(
                animationDuration,
                await triggerMultipleDrawAnimations(
                  input.G.currentPlayerIndex,
                  cards,
                  handIndices,
                  500,
                  completionAnimationDuration,
                ),
              );
            }
          }
        } else {
          // Trigger animation for other AI actions that need it.
          // triggerAIAnimation is synchronous — the actual wait happens via
          // waitForAnimations().
          if ((action.type === 'PLAY_CARD' || action.type === 'DISCARD_CARD') && input.G.selectedCard) {
            triggerAIAnimation(input.G, action);
            await animationServiceBridge.waitForAnimations();
          }

          if (action.type === 'PLAY_CARD' && completedBuildPileCards) {
            animationDuration = triggerCompletedBuildPileAnimation(
              input.G,
              action.buildPile,
              completedBuildPileCards,
              input.G.completedBuildPiles.length,
            );
          }
        }

        return { action, animationDuration };
      }),
      drawService: fromPromise(async ({ input }: { input: { G: GameState } }) => {
        const gameState = input.G;
        const player = gameState.players[gameState.currentPlayerIndex];
        // Debug: override AI hand via query param aiHand (supports [1,2,3,4,5], 1,2,3,4,5 and 1-2-3-4-5)
        if (typeof window !== 'undefined' && player.isAI) {
          try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('aiHand');
            if (raw) {
              let numbers: number[] = [];

              // 1) Try JSON array first (e.g., "[1,2,3,4,5]")
              try {
                const maybe: unknown = JSON.parse(raw);
                if (Array.isArray(maybe)) {
                  numbers = maybe
                    .map((n) => (typeof n === 'string' ? parseInt(n, 10) : Number(n)))
                    .filter((n) => Number.isFinite(n) && n >= 1);
                }
              } catch {
                // Not JSON, fall through
              }

              // 2) Fallback: remove brackets/spaces and split by comma or dash
              if (numbers.length === 0) {
                const cleaned = raw.replace(/\[/g, '').replace(/]/g, '').replace(/\s/g, '');
                const tokens = cleaned.split(/[,-]/).filter(Boolean);
                numbers = tokens.map((t) => parseInt(t, 10)).filter((n) => Number.isFinite(n) && n >= 1);
              }

              if (numbers.length > 0) {
                const hand: Card[] = numbers.map((v) => ({ value: v, isSkipBo: false }));
                return { type: 'DEBUG_SET_AI_HAND', hand, animationDuration: 0 };
              }
            }
          } catch {
            /* ignore invalid aiHand param */
          }
        }
        // The turn-boundary rule (turn starts → current player draws) lives in
        // game-core's planStartOfTurnDraw, shared with the online runtime.
        const { action, plan } = planStartOfTurnDraw(gameState);
        let animationDuration = 0;

        if (plan.cards.length > 0) {
          animationDuration = await triggerMultipleDrawAnimations(
            gameState.currentPlayerIndex,
            plan.cards,
            plan.handIndices,
          );
        }

        return { ...action, animationDuration };
      }),
    },
  },
);
