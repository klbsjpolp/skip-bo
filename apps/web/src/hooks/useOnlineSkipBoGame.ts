import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  canPlayCard,
  type Card,
  gameReducer,
  type GameState,
  getCompletedBuildPileCards,
  initialGameState,
  type MoveResult,
} from '@skipbo/game-core';
import {
  type ClientGameView,
  type CreateRoomResponse,
  type DisconnectedSeatInfo,
  type LobbyReadyState,
  type LobbySeatInfo,
  serializeClientGameView,
  type ServerMessage,
} from '@skipbo/multiplayer-protocol';

import type { GameAction } from '@/state/gameActions';
import { useCardAnimation } from '@/contexts/useCardAnimation';
import {
  setGlobalCompletedPileAnimationContext,
  triggerCompletedBuildPileAnimation,
} from '@/services/completedBuildPileAnimationService';
import {
  calculateMultipleDrawAnimationDuration,
  setGlobalDrawAnimationContext,
  triggerMultipleDrawAnimations,
} from '@/services/drawAnimationService';
import { setGlobalAnimationContext, triggerAIAnimation } from '@/services/aiAnimationService';
import { consumeDragCommitOverride } from '@/services/dragCommitOverride';
import {
  calculateAnimationDuration,
  getBuildPilePosition,
  getDiscardTopCardPosition,
  getHandCardAngle,
  getHandCardPosition,
  getNextDiscardCardPosition,
  getStockCardPosition,
} from '@/utils/cardPositions';
import { clearOnlineSession } from '@/state/sessionPersistence';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const WEBSOCKET_PING_INTERVAL_MS = 4 * 60 * 1000;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000];

const cloneGameStateFromView = (view: ClientGameView): GameState => ({
  buildPiles: view.buildPiles.map((pile) => pile.map((card) => ({ ...card }))),
  completedBuildPiles: view.completedBuildPiles.map((card) => ({ ...card })),
  config: view.config,
  currentPlayerIndex: view.currentPlayerIndex,
  deck: view.deck.map((card) => ({ ...card })),
  gameIsOver: view.gameIsOver,
  message: view.message,
  players: view.players.map((player) => ({
    ...player,
    discardPiles: player.discardPiles.map((pile) => pile.map((card) => ({ ...card }))),
    hand: player.hand.map((card) => (card ? { ...card } : null)),
    stockPile: player.stockPile.map((card) => ({ ...card })),
  })),
  selectedCard: view.selectedCard ? { ...view.selectedCard, card: { ...view.selectedCard.card } } : null,
  winnerIndex: view.winnerIndex,
});

const createPlaceholderGameState = (roomCode: string, seatCapacity: number): GameState => {
  const state = initialGameState({ playerCount: seatCapacity });

  state.deck = [];
  state.buildPiles = state.buildPiles.map(() => []);
  state.completedBuildPiles = [];
  state.players = state.players.map((player, playerIndex) => ({
    ...player,
    discardPiles: player.discardPiles.map(() => []),
    hand: player.hand.map(() => null),
    isAI: playerIndex !== 0,
    kind: 'human',
    seatIndex: playerIndex,
    stockPile: [],
  }));
  state.message = `Connexion à la partie ${roomCode}`;

  return state;
};

const willPlayCardEmptyHand = (gameState: GameState): boolean => {
  if (!gameState.selectedCard || gameState.selectedCard.source !== 'hand') {
    return false;
  }

  const player = gameState.players[gameState.currentPlayerIndex];
  const handAfterPlay = [...player.hand];
  handAfterPlay[gameState.selectedCard.index] = null;

  return handAfterPlay.every((card) => card === null);
};

interface DrawTransition {
  cards: Card[];
  handIndices: number[];
  playerIndex: number;
}

export interface OpponentTransition {
  action: Extract<GameAction, { type: 'DISCARD_CARD' | 'PLAY_CARD' }>;
  animationCard: Card;
  completedBuildPileIndex?: number;
  completedCards?: Card[];
  sourceRevealed: boolean;
  targetPileLength: number;
}

interface TurnPresentationOverride {
  currentPlayerIndex: number;
  message: string;
}

const serializeLocalView = (gameState: GameState, currentView: ClientGameView): ClientGameView =>
  serializeClientGameView({
    connectedSeats: currentView.room.connectedSeats,
    expiresAt: currentView.room.expiresAt,
    gameState,
    hostSeatIndex: currentView.room.hostSeatIndex,
    lobbySeats: currentView.room.lobbySeats,
    roomCode: currentView.room.roomCode,
    seatCapacity: currentView.room.seatCapacity,
    status: currentView.room.status,
    version: currentView.room.version,
    viewerSeatIndex: 0,
  });

const applyOptimisticPlayView = (
  currentView: ClientGameView,
  buildPile: number,
  shouldHideRefilledHand: boolean,
): ClientGameView => {
  const optimisticState = gameReducer(cloneGameStateFromView(currentView), {
    type: 'PLAY_CARD',
    buildPile,
  });

  const optimisticStateForView = shouldHideRefilledHand
    ? {
        ...optimisticState,
        players: optimisticState.players.map((player, index) =>
          index === 0
            ? {
                ...player,
                hand: player.hand.map(() => null),
              }
            : player,
        ),
      }
    : optimisticState;

  return serializeLocalView(optimisticStateForView, currentView);
};

const applyOptimisticDiscardView = (currentView: ClientGameView, discardPile: number): ClientGameView =>
  serializeLocalView(
    gameReducer(cloneGameStateFromView(currentView), {
      type: 'DISCARD_CARD',
      discardPile,
    }),
    currentView,
  );

const collectDrawTransitions = (previousState: GameState, nextState: GameState): DrawTransition[] => {
  if (previousState.players.length !== nextState.players.length) {
    return [];
  }

  return previousState.players.flatMap((_, playerIndex) => {
    const cards: Card[] = [];
    const handIndices: number[] = [];

    nextState.players[playerIndex].hand.forEach((card, handIndex) => {
      if (previousState.players[playerIndex].hand[handIndex] === null && card !== null) {
        cards.push({ ...card });
        handIndices.push(handIndex);
      }
    });

    return cards.length > 0
      ? [
          {
            cards,
            handIndices,
            playerIndex,
          },
        ]
      : [];
  });
};

export const inferOpponentTransition = (previousState: GameState, nextState: GameState): OpponentTransition | null => {
  if (previousState.players.length !== nextState.players.length) {
    return null;
  }

  if (previousState.currentPlayerIndex === 0 || !previousState.selectedCard || nextState.selectedCard) {
    return null;
  }

  const opponentPlayerIndex = previousState.currentPlayerIndex;
  const sourceRevealed = previousState.selectedCard.source !== 'hand';
  const previousCompletedCount = previousState.completedBuildPiles.length;
  const completedCards = nextState.completedBuildPiles.slice(previousCompletedCount).map((card) => ({ ...card }));

  const discardPile = nextState.players[opponentPlayerIndex].discardPiles.findIndex(
    (pile, index) => pile.length === previousState.players[opponentPlayerIndex].discardPiles[index].length + 1,
  );
  if (discardPile >= 0) {
    const animationCard = nextState.players[opponentPlayerIndex].discardPiles[discardPile].at(-1);
    const targetPileLength = nextState.players[opponentPlayerIndex].discardPiles[discardPile].length;

    return animationCard
      ? {
          action: { type: 'DISCARD_CARD', discardPile },
          animationCard: { ...animationCard },
          sourceRevealed,
          targetPileLength,
        }
      : null;
  }

  const buildPile = nextState.buildPiles.findIndex((pile, index) => {
    const previousPile = previousState.buildPiles[index];

    return (
      pile.length === previousPile.length + 1 ||
      (previousPile.length === previousState.config.CARD_VALUES_MAX - 1 &&
        pile.length === 0 &&
        completedCards.length > 0)
    );
  });

  if (buildPile < 0) {
    return null;
  }

  const animationCard = nextState.buildPiles[buildPile].at(-1) ?? completedCards.at(-1);
  if (!animationCard) {
    return null;
  }

  return {
    action: { type: 'PLAY_CARD', buildPile },
    animationCard: { ...animationCard },
    completedBuildPileIndex: completedCards.length > 0 ? buildPile : undefined,
    completedCards: completedCards.length > 0 ? completedCards : undefined,
    sourceRevealed,
    targetPileLength: nextState.buildPiles[buildPile].length,
  };
};

const scheduleDrawAnimations = (drawTransitions: DrawTransition[], baseDelay: number = 0): void => {
  drawTransitions.forEach((drawTransition) => {
    void triggerMultipleDrawAnimations(
      drawTransition.playerIndex,
      drawTransition.cards,
      drawTransition.handIndices,
      500,
      baseDelay,
    ).catch((error) => {
      console.warn('Draw animation failed during online transition:', error);
    });
  });
};

const getMaxDrawAnimationDuration = (drawTransitions: DrawTransition[], baseDelay: number = 0): number =>
  drawTransitions.reduce(
    (maxDuration, drawTransition) =>
      Math.max(
        maxDuration,
        calculateMultipleDrawAnimationDuration(drawTransition.playerIndex, drawTransition.handIndices, 500, baseDelay),
      ),
    0,
  );

export function useOnlineSkipBoGame(session: CreateRoomResponse | null) {
  const [view, setView] = useState<ClientGameView | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [turnPresentationOverride, setTurnPresentationOverride] = useState<TurnPresentationOverride | null>(null);
  const [lobbyRemovalReason, setLobbyRemovalReason] = useState<'host-left' | 'kicked' | null>(null);
  const authoritativeViewRef = useRef<ClientGameView | null>(null);
  const interactionLockRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const viewRef = useRef<ClientGameView | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const turnPresentationTimeoutRef = useRef<number | null>(null);
  const { removeAnimation, startAnimation, waitForAnimations } = useCardAnimation();
  const setInteractionLocked = useCallback((locked: boolean) => {
    interactionLockRef.current = locked;
  }, []);
  // Animations are decoupled from the interaction lock: the user can keep
  // selecting and playing cards while previous animations are still in flight.
  // `interactionLockRef` is only held for the synchronous body of
  // playCard/discardCard so two concurrent dispatches can't race on the same
  // selectedCard.
  const isInteractionBlocked = useCallback(() => interactionLockRef.current, []);
  const commitView = useCallback((nextView: ClientGameView | null) => {
    viewRef.current = nextView;
    setView(nextView);
  }, []);
  const updateView = useCallback((updater: (currentView: ClientGameView | null) => ClientGameView | null) => {
    const nextView = updater(viewRef.current);
    viewRef.current = nextView;
    setView(nextView);
  }, []);

  useEffect(() => {
    setGlobalAnimationContext({ startAnimation, waitForAnimations });
    setGlobalDrawAnimationContext({ startAnimation, removeAnimation });
    setGlobalCompletedPileAnimationContext({ startAnimation });
  }, [removeAnimation, startAnimation, waitForAnimations]);

  useEffect(() => {
    const clearPingInterval = () => {
      if (pingIntervalRef.current !== null) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    const clearTurnPresentationTimeout = () => {
      if (turnPresentationTimeoutRef.current !== null) {
        window.clearTimeout(turnPresentationTimeoutRef.current);
        turnPresentationTimeoutRef.current = null;
      }
    };

    if (!session) {
      setInteractionLocked(false);
      clearReconnectTimeout();
      clearPingInterval();
      clearTurnPresentationTimeout();
      websocketRef.current?.close();
      websocketRef.current = null;
      authoritativeViewRef.current = null;
      viewRef.current = null;
      return;
    }

    authoritativeViewRef.current = null;
    viewRef.current = null;
    intentionalLeaveRef.current = false;

    let socket: WebSocket | null = null;
    let isCancelled = false;
    let reconnectAttempt = 0;
    const isCurrentSocket = (candidate: WebSocket): boolean => websocketRef.current === candidate;
    const startPingLoop = (currentSocket: WebSocket) => {
      clearPingInterval();
      pingIntervalRef.current = window.setInterval(() => {
        if (!isCurrentSocket(currentSocket) || currentSocket.readyState !== WebSocket.OPEN) {
          return;
        }

        currentSocket.send(JSON.stringify({ type: 'ping' }));
      }, WEBSOCKET_PING_INTERVAL_MS);
    };
    const scheduleReconnect = () => {
      if (isCancelled || reconnectTimeoutRef.current !== null) {
        return;
      }

      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttempt += 1;
      setConnectionStatus('connecting');
      clearPingInterval();
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (isCancelled) {
        return;
      }

      const currentSocket = new WebSocket(session.wsUrl);
      socket = currentSocket;
      websocketRef.current = currentSocket;

      currentSocket.addEventListener('open', () => {
        if (!isCurrentSocket(currentSocket)) {
          return;
        }

        reconnectAttempt = 0;
        currentSocket.send(
          JSON.stringify({
            type: 'auth',
            roomCode: session.roomCode,
            seatIndex: session.seatIndex,
            seatToken: session.seatToken,
          }),
        );
        startPingLoop(currentSocket);
      });

      currentSocket.addEventListener('message', (event) => {
        if (!isCurrentSocket(currentSocket)) {
          return;
        }

        try {
          if (typeof event.data !== 'string') {
            return;
          }

          const message = JSON.parse(event.data) as ServerMessage;

          switch (message.type) {
            case 'snapshot': {
              setInteractionLocked(false);
              setConnectionStatus('connected');
              setLastError(null);
              authoritativeViewRef.current = message.view;

              if (message.view.room.status === 'FINISHED' || message.view.gameIsOver) {
                clearOnlineSession();
              }

              const previousView = viewRef.current;
              if (previousView) {
                const previousState = cloneGameStateFromView(previousView);
                const nextState = cloneGameStateFromView(message.view);
                const drawTransitions = collectDrawTransitions(previousState, nextState);
                const opponentTransition = inferOpponentTransition(previousState, nextState);
                // When an opponent plays the last card of their hand, the slot
                // it left behind gets refilled in the next snapshot. Comparing
                // hand[index] before/after only catches null→card transitions,
                // so the just-played slot would otherwise pop in without
                // animation while its 4 siblings fly from the deck.
                if (
                  opponentTransition &&
                  previousState.selectedCard?.source === 'hand' &&
                  previousState.currentPlayerIndex !== 0
                ) {
                  const opponentIndex = previousState.currentPlayerIndex;
                  const playedSlotIndex = previousState.selectedCard.index;
                  const refilledCard = nextState.players[opponentIndex].hand[playedSlotIndex];
                  const existing = drawTransitions.find((t) => t.playerIndex === opponentIndex);
                  if (refilledCard && (!existing || !existing.handIndices.includes(playedSlotIndex))) {
                    if (existing) {
                      const insertAt = existing.handIndices.findIndex((i) => i > playedSlotIndex);
                      const position = insertAt === -1 ? existing.handIndices.length : insertAt;
                      existing.cards.splice(position, 0, { ...refilledCard });
                      existing.handIndices.splice(position, 0, playedSlotIndex);
                    } else {
                      drawTransitions.push({
                        cards: [{ ...refilledCard }],
                        handIndices: [playedSlotIndex],
                        playerIndex: opponentIndex,
                      });
                    }
                  }
                }
                const turnChanged = previousView.currentPlayerIndex !== message.view.currentPlayerIndex;
                const holdPreviousTurnPresentation = () => {
                  if (!turnChanged) {
                    return;
                  }

                  clearTurnPresentationTimeout();
                  setTurnPresentationOverride({
                    currentPlayerIndex: previousView.currentPlayerIndex,
                    message: previousView.message,
                  });
                };
                const applyTurnPresentationDelay = (duration: number) => {
                  if (!turnChanged || duration <= 0) {
                    clearTurnPresentationTimeout();
                    setTurnPresentationOverride(null);
                    return;
                  }

                  clearTurnPresentationTimeout();
                  turnPresentationTimeoutRef.current = window.setTimeout(() => {
                    turnPresentationTimeoutRef.current = null;
                    setTurnPresentationOverride(null);
                  }, duration);
                };

                if (opponentTransition) {
                  holdPreviousTurnPresentation();
                  // Commit the new view *before* triggering the animation. The
                  // DOM has not yet been updated (React only schedules the
                  // re-render), so triggerAIAnimation can still read the
                  // previous layout via document.querySelector. The flushSync
                  // inside startAnimation then flushes both the new view and
                  // the new animation in a single render — preventing a
                  // one-frame intermediate render where the animation is
                  // registered against the *old* state. That intermediate
                  // render would mask the old stock top and fall back to the
                  // second-from-top card, which on the opponent's stock is a
                  // redacted HIDDEN_CARD and renders as a face-down back —
                  // visible as a brief card-back flash before the new top
                  // appears.
                  commitView(message.view);
                  // Register play, completion, draw refill, and the turn
                  // presentation timer SYNCHRONOUSLY so they all batch into
                  // the same React commit as the new view. A microtask gap
                  // here (e.g. awaiting triggerAIAnimation) lets React paint
                  // a frame where the play animation is registered but the
                  // completion / draw animations are not — causing visible
                  // glitches like the "12" backdrop appearing on the build
                  // pile before the play card lands, or completed cards
                  // leaking onto the retreat pile while the play is still
                  // in flight.
                  const opponentAnimationDuration = triggerAIAnimation(previousState, opponentTransition.action, {
                    cardOverride: opponentTransition.animationCard,
                    sourceRevealedOverride: opponentTransition.sourceRevealed,
                    targetSettledInStateOverride: true,
                    targetPileLengthOverride: opponentTransition.targetPileLength,
                    targetRevealedOverride: true,
                  });
                  if (opponentTransition.completedCards && opponentTransition.completedBuildPileIndex !== undefined) {
                    triggerCompletedBuildPileAnimation(
                      previousState,
                      opponentTransition.completedBuildPileIndex,
                      opponentTransition.completedCards,
                      previousState.completedBuildPiles.length,
                      100,
                      opponentAnimationDuration,
                    );
                  }

                  scheduleDrawAnimations(drawTransitions, opponentAnimationDuration);
                  applyTurnPresentationDelay(
                    Math.max(
                      opponentAnimationDuration,
                      getMaxDrawAnimationDuration(drawTransitions, opponentAnimationDuration),
                    ),
                  );
                } else {
                  const drawAnimationDuration = getMaxDrawAnimationDuration(drawTransitions);
                  if (drawAnimationDuration > 0) {
                    holdPreviousTurnPresentation();
                  }
                  scheduleDrawAnimations(drawTransitions);
                  applyTurnPresentationDelay(drawAnimationDuration);
                  commitView(message.view);
                }
              } else {
                commitView(message.view);
              }

              break;
            }
            case 'presence':
              setConnectionStatus('connected');
              if (message.room.status === 'FINISHED') {
                clearOnlineSession();
              }
              authoritativeViewRef.current = authoritativeViewRef.current
                ? {
                    ...authoritativeViewRef.current,
                    room: message.room,
                  }
                : authoritativeViewRef.current;
              updateView((previousView) =>
                previousView
                  ? {
                      ...previousView,
                      room: message.room,
                    }
                  : previousView,
              );
              break;
            case 'actionRejected':
              setInteractionLocked(false);
              if (authoritativeViewRef.current === null) {
                intentionalLeaveRef.current = true;
                clearOnlineSession();
                setLastError(message.reason);
                currentSocket.close();
              } else if (authoritativeViewRef.current.room.status === 'WAITING') {
                intentionalLeaveRef.current = true;
                currentSocket.close();
                setLobbyRemovalReason('kicked');
              } else {
                setLastError(message.reason);
                commitView(authoritativeViewRef.current ?? viewRef.current);
              }
              break;
            case 'roomClosed':
              setInteractionLocked(false);
              clearOnlineSession();
              if (message.status === 'WAITING' || authoritativeViewRef.current?.room.status === 'WAITING') {
                setLobbyRemovalReason('host-left');
              }
              authoritativeViewRef.current = authoritativeViewRef.current
                ? {
                    ...authoritativeViewRef.current,
                    room: {
                      ...authoritativeViewRef.current.room,
                      status: message.status,
                    },
                  }
                : authoritativeViewRef.current;
              updateView((previousView) =>
                previousView
                  ? {
                      ...previousView,
                      room: {
                        ...previousView.room,
                        status: message.status,
                      },
                    }
                  : previousView,
              );
              break;
          }
        } catch (error) {
          console.warn('Failed to parse websocket message:', error);
        }
      });

      currentSocket.addEventListener('close', () => {
        if (!isCurrentSocket(currentSocket)) {
          return;
        }

        websocketRef.current = null;
        setInteractionLocked(false);
        clearPingInterval();

        if (isCancelled || intentionalLeaveRef.current) {
          setConnectionStatus('disconnected');
          return;
        }

        scheduleReconnect();
      });

      currentSocket.addEventListener('error', () => {
        if (!isCurrentSocket(currentSocket)) {
          return;
        }

        setConnectionStatus('connecting');
      });
    };

    const connectTimeoutId = window.setTimeout(connect, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(connectTimeoutId);
      clearReconnectTimeout();
      clearPingInterval();
      if (turnPresentationTimeoutRef.current !== null) {
        window.clearTimeout(turnPresentationTimeoutRef.current);
        turnPresentationTimeoutRef.current = null;
      }

      if (websocketRef.current === socket) {
        websocketRef.current = null;
      }

      setInteractionLocked(false);

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [commitView, session, setInteractionLocked, updateView]);

  const gameState = useMemo(() => {
    const baseState = view
      ? cloneGameStateFromView(view)
      : createPlaceholderGameState(session?.roomCode ?? '', session?.seatCapacity ?? 4);

    if (!turnPresentationOverride) {
      return baseState;
    }

    return {
      ...baseState,
      currentPlayerIndex: turnPresentationOverride.currentPlayerIndex,
      message: turnPresentationOverride.message,
    };
  }, [session?.roomCode, session?.seatCapacity, turnPresentationOverride, view]);

  const sendAction = useCallback((action: GameAction): void => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(
      JSON.stringify({
        type: 'action',
        action,
        clientVersion: viewRef.current?.room.version,
      }),
    );
  }, []);

  const debugFillBuildPile = useCallback(
    (buildPile: number): void => {
      sendAction({ type: 'DEBUG_FILL_BUILD_PILE', buildPile });
    },
    [sendAction],
  );

  const debugFillHandSkipBo = useCallback((): void => {
    sendAction({ type: 'DEBUG_FILL_HAND_SKIPBO' });
  }, [sendAction]);

  const debugWin = useCallback((): void => {
    sendAction({ type: 'DEBUG_WIN' });
  }, [sendAction]);

  const startGame = useCallback(() => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(
      JSON.stringify({
        type: 'startGame',
        clientVersion: viewRef.current?.room.version,
      }),
    );
  }, []);

  const selectCard = useCallback(
    (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
      const currentState = gameState;
      const player = currentState.players[currentState.currentPlayerIndex];

      if (
        currentState.currentPlayerIndex !== 0 ||
        !player ||
        connectionStatus !== 'connected' ||
        isInteractionBlocked()
      ) {
        return;
      }

      let card: Card | null | undefined;
      if (source === 'hand') {
        card = player.hand[index];
      } else if (source === 'stock') {
        card = player.stockPile[player.stockPile.length - 1];
      } else {
        card = discardPileIndex === undefined ? null : player.discardPiles[discardPileIndex]?.at(-1);
      }

      if (!card) {
        return;
      }

      updateView((previousView) =>
        previousView
          ? {
              ...previousView,
              message: 'Sélectionnez une destination',
              selectedCard: {
                card,
                source,
                index,
                discardPileIndex,
              },
            }
          : previousView,
      );

      sendAction({ type: 'SELECT_CARD', source, index, discardPileIndex });
    },
    [connectionStatus, gameState, isInteractionBlocked, sendAction, updateView],
  );

  const clearSelection = useCallback(() => {
    if (isInteractionBlocked()) {
      return;
    }

    updateView((previousView) =>
      previousView
        ? {
            ...previousView,
            message: "C'est votre tour",
            selectedCard: null,
          }
        : previousView,
    );

    sendAction({ type: 'CLEAR_SELECTION' });
  }, [isInteractionBlocked, sendAction, updateView]);

  const playCard = useCallback(
    async (buildPile: number): Promise<MoveResult> => {
      const currentView = viewRef.current;
      if (!currentView) {
        return { success: false, message: 'Aucune carte sélectionnée' };
      }
      const currentState = cloneGameStateFromView(currentView);
      const completedBuildPileCards = getCompletedBuildPileCards(currentState, buildPile);

      if (isInteractionBlocked()) {
        return { success: false, message: 'Action en cours' };
      }

      if (!currentState.selectedCard) {
        return { success: false, message: 'Aucune carte sélectionnée' };
      }

      if (!canPlayCard(currentState.selectedCard.card, buildPile, currentState)) {
        return { success: false, message: 'Vous ne pouvez pas jouer cette carte' };
      }

      setInteractionLocked(true);

      const willEmptyHand = willPlayCardEmptyHand(currentState);

      // Trigger play animation. The completion animation is queued with a
      // baseDelay so it lands once the play card has reached the build pile.
      // The optimistic view is committed immediately afterwards so the user can
      // continue selecting / playing while everything animates in parallel.
      let playAnimationDuration = 0;
      const dragOverride = consumeDragCommitOverride();
      try {
        const playerAreaElement = document.querySelector<HTMLElement>('.player-area[data-player-index="0"]');
        const centerAreaElement = document.querySelector('.center-area') as HTMLElement;
        let startAngleDeg: number | undefined;

        if (playerAreaElement && centerAreaElement) {
          let startPosition;

          if (currentState.selectedCard.source === 'hand') {
            const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
            if (handContainer) {
              startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index);
              startAngleDeg = getHandCardAngle(handContainer, currentState.selectedCard.index);
            }
          } else if (currentState.selectedCard.source === 'stock') {
            const stockContainer = playerAreaElement.querySelector('.stock-pile') as HTMLElement;
            if (stockContainer) {
              startPosition = getStockCardPosition(stockContainer);
            }
          } else if (currentState.selectedCard.source === 'discard') {
            const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
            if (discardContainer && currentState.selectedCard.discardPileIndex !== undefined) {
              startPosition = getDiscardTopCardPosition(discardContainer, currentState.selectedCard.discardPileIndex);
            }
          }

          // Drag-and-drop commit: start the play animation from the drop point.
          if (dragOverride?.startPosition) {
            startPosition = dragOverride.startPosition;
            startAngleDeg = undefined;
          }

          const endPosition = getBuildPilePosition(centerAreaElement, buildPile);

          if (startPosition) {
            playAnimationDuration = calculateAnimationDuration(startPosition, endPosition) * 1.2;
            // Mask the freshly-committed card at the build pile until the play
            // animation has actually landed. Without targetSettledInState the
            // optimistic view would render the new card immediately on top of
            // the pile, making it appear teleported to its destination before
            // flying there.
            const previousBuildPileLength = currentState.buildPiles[buildPile].length;
            startAnimation({
              card: currentState.selectedCard.card,
              startPosition,
              endPosition,
              startAngleDeg,
              animationType: 'play',
              sourceRevealed: true,
              targetRevealed: true,
              initialDelay: 0,
              duration: playAnimationDuration,
              targetSettledInState: true,
              targetPileLength: previousBuildPileLength + 1,
              sourceInfo: {
                playerIndex: currentState.currentPlayerIndex,
                source: currentState.selectedCard.source,
                index: currentState.selectedCard.index,
                discardPileIndex: currentState.selectedCard.discardPileIndex,
              },
              targetInfo: {
                playerIndex: currentState.currentPlayerIndex,
                source: 'build',
                index: buildPile,
              },
            });
          }
        }
      } catch (error) {
        console.warn('Play animation failed, continuing with online game logic:', error);
      }

      // Register the build→retreat animation BEFORE committing the optimistic
      // view. CenterArea relies on activeAnimations to mask completed cards at
      // their destination; if we committed first, the cards would render on the
      // retreat pile for one frame before the animation starts.
      if (completedBuildPileCards) {
        triggerCompletedBuildPileAnimation(
          currentState,
          buildPile,
          completedBuildPileCards,
          currentState.completedBuildPiles.length,
          100,
          playAnimationDuration,
        );
      }

      if (viewRef.current) {
        commitView(applyOptimisticPlayView(viewRef.current, buildPile, willEmptyHand));
      }

      sendAction({ type: 'PLAY_CARD', buildPile });
      setInteractionLocked(false);
      return { success: true, message: 'Carte jouée' };
    },
    [commitView, isInteractionBlocked, sendAction, setInteractionLocked, startAnimation],
  );

  const discardCard = useCallback(
    (discardPile: number): Promise<MoveResult> =>
      new Promise((resolve) => {
        const currentView = viewRef.current;
        if (!currentView) {
          resolve({ success: false, message: 'Aucune carte sélectionnée' });
          return;
        }
        const currentState = cloneGameStateFromView(currentView);

        if (isInteractionBlocked()) {
          resolve({ success: false, message: 'Action en cours' });
          return;
        }

        if (!currentState.selectedCard) {
          resolve({ success: false, message: 'Aucune carte sélectionnée' });
          return;
        }

        if (currentState.selectedCard.source !== 'hand') {
          resolve({ success: false, message: 'Vous devez défausser une carte de votre main' });
          return;
        }

        setInteractionLocked(true);

        // Trigger discard animation, then commit the optimistic view and send the
        // action immediately. The animation runs in parallel with the next user
        // input — they can already select / play another card while this discard
        // is still flying. The discard ends the human turn server-side, so any
        // further play attempt is rejected (and the snapshot reconciles).
        const dragOverride = consumeDragCommitOverride();

        try {
          const playerAreaElement = document.querySelector<HTMLElement>('.player-area[data-player-index="0"]');

          if (playerAreaElement) {
            const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
            if (handContainer) {
              const startPosition =
                dragOverride?.startPosition ?? getHandCardPosition(handContainer, currentState.selectedCard.index);
              const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
              if (discardContainer) {
                const endPosition = getNextDiscardCardPosition(discardContainer, discardPile);
                const animationDuration = calculateAnimationDuration(startPosition, endPosition);
                // Mask the freshly-committed card on the discard pile until the
                // animation lands — the optimistic view applies immediately, so
                // without this the card would teleport to the pile and then
                // re-animate.
                const previousDiscardPileLength =
                  currentState.players[currentState.currentPlayerIndex].discardPiles[discardPile].length;
                startAnimation({
                  card: currentState.selectedCard.card,
                  startPosition,
                  endPosition,
                  animationType: 'discard',
                  sourceRevealed: true,
                  targetRevealed: true,
                  initialDelay: 0,
                  duration: animationDuration,
                  startAngleDeg: dragOverride?.startPosition
                    ? undefined
                    : getHandCardAngle(handContainer, currentState.selectedCard.index),
                  targetSettledInState: true,
                  targetPileLength: previousDiscardPileLength + 1,
                  sourceInfo: {
                    playerIndex: currentState.currentPlayerIndex,
                    source: currentState.selectedCard.source,
                    index: currentState.selectedCard.index,
                    discardPileIndex: currentState.selectedCard.discardPileIndex,
                  },
                  targetInfo: {
                    playerIndex: currentState.currentPlayerIndex,
                    source: 'discard',
                    index: discardPile,
                    discardPileIndex: discardPile,
                  },
                });
              }
            }
          }
        } catch (error) {
          console.warn('Discard animation failed, continuing with online game logic:', error);
        }

        if (viewRef.current) {
          commitView(applyOptimisticDiscardView(viewRef.current, discardPile));
        }

        sendAction({ type: 'DISCARD_CARD', discardPile });
        setInteractionLocked(false);
        resolve({ success: true, message: 'Carte défaussée' });
      }),
    [commitView, isInteractionBlocked, sendAction, setInteractionLocked, startAnimation],
  );

  const sendSetReady = useCallback((playerName?: string): void => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(JSON.stringify({ type: 'setReady', playerName }));
  }, []);

  const sendSetUnready = useCallback((): void => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(JSON.stringify({ type: 'setUnready' }));
  }, []);

  const kickSeat = useCallback((targetSeatIndex: number): void => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(JSON.stringify({ type: 'kickSeat', targetSeatIndex }));
  }, []);

  const leaveLobby = useCallback((): void => {
    intentionalLeaveRef.current = true;

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'leaveLobby' }));
    }
  }, []);

  const playersBySeatIndex: Record<number, { displayName: string; seatIndex: number }> = {};
  view?.players.forEach((player) => {
    if (typeof player.seatIndex === 'number') {
      playersBySeatIndex[player.seatIndex] = { displayName: player.displayName, seatIndex: player.seatIndex };
    }
  });
  view?.room.lobbySeats.forEach((seat) => {
    if (!playersBySeatIndex[seat.seatIndex] && seat.displayName) {
      playersBySeatIndex[seat.seatIndex] = { displayName: seat.displayName, seatIndex: seat.seatIndex };
    }
  });

  const seatCapacity = view?.room.seatCapacity ?? session?.seatCapacity ?? 4;
  const hostSeatIndex = view?.room.hostSeatIndex ?? session?.hostSeatIndex ?? 0;
  const connectedSeats = view?.room.connectedSeats ?? [];
  const disconnectedSeats: DisconnectedSeatInfo[] = view?.room.disconnectedSeats ?? [];
  const lobbySeats: LobbySeatInfo[] = view?.room.lobbySeats ?? [];
  const roomStatus = view?.room.status ?? 'WAITING';
  const isLocalHost = session?.seatIndex === hostSeatIndex;
  const myReadyState: LobbyReadyState =
    lobbySeats.find((s) => s.seatIndex === session?.seatIndex)?.readyState ?? 'never-ready';
  const canStartGame = Boolean(
    isLocalHost &&
    roomStatus === 'WAITING' &&
    connectedSeats.length >= 2 &&
    connectedSeats.every((seatIndex) => lobbySeats.find((s) => s.seatIndex === seatIndex)?.readyState === 'ready'),
  );

  return {
    canStartGame,
    clearSelection,
    connectedSeats,
    connectionStatus,
    debugFillBuildPile,
    debugFillHandSkipBo,
    debugWin,
    disconnectedSeats,
    gameState,
    hostSeatIndex,
    isLocalHost,
    kickSeat,
    lastError,
    leaveLobby,
    lobbySeats,
    myReadyState,
    playCard,
    playersBySeatIndex,
    roomCode: view?.room.roomCode ?? session?.roomCode ?? '',
    roomStatus,
    seatCapacity,
    selectCard,
    sendSetReady,
    sendSetUnready,
    startGame,
    discardCard,
    canPlayCard,
    lobbyRemovalReason,
  };
}
