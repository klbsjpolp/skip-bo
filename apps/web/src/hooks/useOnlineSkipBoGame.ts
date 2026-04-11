import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { canPlayCard, gameReducer, getCompletedBuildPileCards, initialGameState, type Card, type GameState, type MoveResult } from '@skipbo/game-core';
import { serializeClientGameView, type ClientGameView, type CreateRoomResponse, type ServerMessage } from '@skipbo/multiplayer-protocol';

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
import {
  calculateAnimationDuration,
  getBuildPilePosition,
  getDiscardTopCardPosition,
  getHandCardAngle,
  getHandCardPosition,
  getNextDiscardCardPosition,
  getStockCardPosition,
} from '@/utils/cardPositions';

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

const createPlaceholderGameState = (roomCode: string): GameState => {
  const state = initialGameState();

  state.players[1].isAI = true;
  state.players[1].kind = 'human';
  state.players[0].kind = 'human';
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

interface OpponentTransition {
  action: Extract<GameAction, { type: 'DISCARD_CARD' | 'PLAY_CARD' }>;
  animationCard: Card;
  completedBuildPileIndex?: number;
  completedCards?: Card[];
  sourceRevealed: boolean;
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
    roomCode: currentView.room.roomCode,
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
        players: optimisticState.players.map((player, index) => (
          index === 0
            ? {
                ...player,
                hand: player.hand.map(() => null),
              }
            : player
        )),
      }
    : optimisticState;

  return serializeLocalView(optimisticStateForView, currentView);
};

const applyOptimisticDiscardView = (
  currentView: ClientGameView,
  discardPile: number,
): ClientGameView =>
  serializeLocalView(
    gameReducer(cloneGameStateFromView(currentView), {
      type: 'DISCARD_CARD',
      discardPile,
    }),
    currentView,
  );

const collectDrawTransitions = (
  previousState: GameState,
  nextState: GameState,
): DrawTransition[] =>
  [0, 1].flatMap((playerIndex) => {
    const cards: Card[] = [];
    const handIndices: number[] = [];

    nextState.players[playerIndex].hand.forEach((card, handIndex) => {
      if (previousState.players[playerIndex].hand[handIndex] === null && card !== null) {
        cards.push({ ...card });
        handIndices.push(handIndex);
      }
    });

    return cards.length > 0
      ? [{
          cards,
          handIndices,
          playerIndex,
        }]
      : [];
  });

const inferOpponentTransition = (
  previousState: GameState,
  nextState: GameState,
): OpponentTransition | null => {
  if (previousState.currentPlayerIndex !== 1 || !previousState.selectedCard || nextState.selectedCard) {
    return null;
  }

  const sourceRevealed = previousState.selectedCard.source !== 'hand';
  const previousCompletedCount = previousState.completedBuildPiles.length;
  const completedCards = nextState.completedBuildPiles
    .slice(previousCompletedCount)
    .map((card) => ({ ...card }));

  const discardPile = nextState.players[1].discardPiles.findIndex(
    (pile, index) => pile.length === previousState.players[1].discardPiles[index].length + 1,
  );
  if (discardPile >= 0) {
    const animationCard = nextState.players[1].discardPiles[discardPile].at(-1);

    return animationCard
      ? {
          action: { type: 'DISCARD_CARD', discardPile },
          animationCard: { ...animationCard },
          sourceRevealed,
        }
      : null;
  }

  const buildPile = nextState.buildPiles.findIndex((pile, index) => {
    const previousPile = previousState.buildPiles[index];

    return (
      pile.length === previousPile.length + 1 ||
      (
        previousPile.length === previousState.config.CARD_VALUES_MAX - 1 &&
        pile.length === 0 &&
        completedCards.length > 0
      )
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
  };
};

const scheduleDrawAnimations = (
  drawTransitions: DrawTransition[],
  baseDelay: number = 0,
): void => {
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

const getMaxDrawAnimationDuration = (
  drawTransitions: DrawTransition[],
  baseDelay: number = 0,
): number =>
  drawTransitions.reduce((maxDuration, drawTransition) => (
    Math.max(
      maxDuration,
      calculateMultipleDrawAnimationDuration(
        drawTransition.playerIndex,
        drawTransition.handIndices,
        500,
        baseDelay,
      ),
    )
  ), 0);

export function useOnlineSkipBoGame(session: CreateRoomResponse | null) {
  const [view, setView] = useState<ClientGameView | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [turnPresentationOverride, setTurnPresentationOverride] = useState<TurnPresentationOverride | null>(null);
  const authoritativeViewRef = useRef<ClientGameView | null>(null);
  const interactionLockRef = useRef(false);
  const viewRef = useRef<ClientGameView | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const turnPresentationTimeoutRef = useRef<number | null>(null);
  const { removeAnimation, startAnimation, waitForAnimations } = useCardAnimation();
  const setInteractionLocked = useCallback((locked: boolean) => {
    interactionLockRef.current = locked;
  }, []);
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
        currentSocket.send(JSON.stringify({
          type: 'auth',
          roomCode: session.roomCode,
          seatIndex: session.seatIndex,
          seatToken: session.seatToken,
        }));
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

              const previousView = viewRef.current;
              if (previousView) {
                const previousState = cloneGameStateFromView(previousView);
                const nextState = cloneGameStateFromView(message.view);
                const drawTransitions = collectDrawTransitions(previousState, nextState);
                const opponentTransition = inferOpponentTransition(previousState, nextState);
                const turnChanged = previousView.currentPlayerIndex !== message.view.currentPlayerIndex;
                const applyTurnPresentationDelay = (duration: number) => {
                  if (!turnChanged || duration <= 0) {
                    clearTurnPresentationTimeout();
                    setTurnPresentationOverride(null);
                    return;
                  }

                  clearTurnPresentationTimeout();
                  setTurnPresentationOverride({
                    currentPlayerIndex: previousView.currentPlayerIndex,
                    message: previousView.message,
                  });
                  turnPresentationTimeoutRef.current = window.setTimeout(() => {
                    turnPresentationTimeoutRef.current = null;
                    setTurnPresentationOverride(null);
                  }, duration);
                };

                if (opponentTransition) {
                  void triggerAIAnimation(previousState, opponentTransition.action, {
                    cardOverride: opponentTransition.animationCard,
                    sourceRevealedOverride: opponentTransition.sourceRevealed,
                    targetSettledInStateOverride: true,
                    targetRevealedOverride: true,
                  }).then((opponentAnimationDuration) => {
                    if (
                      opponentTransition.completedCards &&
                      opponentTransition.completedBuildPileIndex !== undefined
                    ) {
                      window.setTimeout(() => {
                        triggerCompletedBuildPileAnimation(
                          previousState,
                          opponentTransition.completedBuildPileIndex!,
                          opponentTransition.completedCards!,
                          previousState.completedBuildPiles.length,
                        );
                      }, opponentAnimationDuration);
                    }

                    scheduleDrawAnimations(drawTransitions, opponentAnimationDuration);
                    applyTurnPresentationDelay(Math.max(
                      opponentAnimationDuration,
                      getMaxDrawAnimationDuration(drawTransitions, opponentAnimationDuration),
                    ));
                  });
                } else {
                  scheduleDrawAnimations(drawTransitions);
                  applyTurnPresentationDelay(getMaxDrawAnimationDuration(drawTransitions));
                }
              }

              commitView(message.view);
              break;
            }
            case 'presence':
              setConnectionStatus('connected');
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
              setLastError(message.reason);
              commitView(authoritativeViewRef.current ?? viewRef.current);
              break;
            case 'roomClosed':
              setInteractionLocked(false);
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

        if (isCancelled) {
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

  const gameState = useMemo(
    () => {
      const baseState = view
        ? cloneGameStateFromView(view)
        : createPlaceholderGameState(session?.roomCode ?? '');

      if (!turnPresentationOverride) {
        return baseState;
      }

      return {
        ...baseState,
        currentPlayerIndex: turnPresentationOverride.currentPlayerIndex,
        message: turnPresentationOverride.message,
      };
    },
    [session?.roomCode, turnPresentationOverride, view],
  );

  const sendAction = useCallback((action: GameAction): void => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(JSON.stringify({
      type: 'action',
      action,
      clientVersion: viewRef.current?.room.version,
    }));
  }, []);

  const selectCard = useCallback((source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
    const currentState = gameState;
    const player = currentState.players[currentState.currentPlayerIndex];

    if (
      currentState.currentPlayerIndex !== 0 ||
      !player ||
      connectionStatus !== 'connected' ||
      interactionLockRef.current
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
  }, [connectionStatus, gameState, sendAction, updateView]);

  const clearSelection = useCallback(() => {
    if (interactionLockRef.current) {
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
  }, [sendAction, updateView]);

  const playCard = useCallback(async (buildPile: number): Promise<MoveResult> => {
    const currentState = gameState;
    const completedBuildPileCards = getCompletedBuildPileCards(currentState, buildPile);

    if (interactionLockRef.current) {
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
    let optimisticViewCommitted = false;
    const commitOptimisticPlayView = () => {
      if (optimisticViewCommitted || !viewRef.current) {
        return;
      }

      optimisticViewCommitted = true;
      commitView(applyOptimisticPlayView(viewRef.current, buildPile, willEmptyHand));
    };

    try {
      const playerAreas = document.querySelectorAll('.player-area');
      const domIndex = currentState.currentPlayerIndex === 0 ? 1 : 0;
      const playerAreaElement = playerAreas[domIndex] as HTMLElement;
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

        const endPosition = getBuildPilePosition(centerAreaElement, buildPile);

        if (startPosition) {
          const duration = calculateAnimationDuration(startPosition, endPosition) * 1.2;
          window.setTimeout(commitOptimisticPlayView, duration);
          startAnimation({
            card: currentState.selectedCard.card,
            startPosition,
            endPosition,
            startAngleDeg,
            animationType: 'play',
            sourceRevealed: true,
            targetRevealed: true,
            initialDelay: 0,
            duration,
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

          await waitForAnimations();
        }
      }
    } catch (error) {
      console.warn('Play animation failed, continuing with online game logic:', error);
    }

    commitOptimisticPlayView();

    if (completedBuildPileCards) {
      triggerCompletedBuildPileAnimation(
        currentState,
        buildPile,
        completedBuildPileCards,
        currentState.completedBuildPiles.length,
      );
    }
    sendAction({ type: 'PLAY_CARD', buildPile });
    return { success: true, message: 'Carte jouée' };
  }, [commitView, gameState, sendAction, setInteractionLocked, startAnimation, waitForAnimations]);

  const discardCard = useCallback((discardPile: number): Promise<MoveResult> => new Promise((resolve) => {
    const currentState = gameState;

    if (interactionLockRef.current) {
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

    if (currentState.selectedCard.card.isSkipBo) {
      resolve({ success: false, message: 'Vous ne pouvez pas défausser une carte Skip-Bo' });
      return;
    }

    setInteractionLocked(true);

    let animationDuration = 0;
    let optimisticViewCommitted = false;
    const commitOptimisticDiscardView = () => {
      if (optimisticViewCommitted || !viewRef.current) {
        return;
      }

      optimisticViewCommitted = true;
      commitView(applyOptimisticDiscardView(viewRef.current, discardPile));
    };

    try {
      const playerAreas = document.querySelectorAll('.player-area');
      const domIndex = currentState.currentPlayerIndex === 0 ? 1 : 0;
      const playerAreaElement = playerAreas[domIndex] as HTMLElement;

      if (playerAreaElement) {
        const handContainer = playerAreaElement.querySelector('.hand-area') as HTMLElement;
        if (handContainer) {
          const startPosition = getHandCardPosition(handContainer, currentState.selectedCard.index);
          const discardContainer = playerAreaElement.querySelector('.discard-piles') as HTMLElement;
          if (discardContainer) {
            const endPosition = getNextDiscardCardPosition(discardContainer, discardPile);
            animationDuration = calculateAnimationDuration(startPosition, endPosition);
            window.setTimeout(() => {
              commitOptimisticDiscardView();
              sendAction({ type: 'DISCARD_CARD', discardPile });
              resolve({ success: true, message: 'Carte défaussée' });
            }, animationDuration);
            startAnimation({
              card: currentState.selectedCard.card,
              startPosition,
              endPosition,
              animationType: 'discard',
              sourceRevealed: true,
              targetRevealed: true,
              initialDelay: 0,
              duration: animationDuration,
              startAngleDeg: getHandCardAngle(handContainer, currentState.selectedCard.index),
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

    if (animationDuration === 0) {
      commitOptimisticDiscardView();
      sendAction({ type: 'DISCARD_CARD', discardPile });
      resolve({ success: true, message: 'Carte défaussée' });
    }
  }), [commitView, gameState, sendAction, setInteractionLocked, startAnimation]);

  return {
    clearSelection,
    connectedSeats: view?.room.connectedSeats ?? [],
    connectionStatus,
    gameState,
    lastError,
    playCard,
    roomCode: view?.room.roomCode ?? session?.roomCode ?? '',
    roomStatus: view?.room.status ?? 'WAITING',
    selectCard,
    discardCard,
    canPlayCard,
  };
}
