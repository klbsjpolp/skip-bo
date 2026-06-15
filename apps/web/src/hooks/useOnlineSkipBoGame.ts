import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { canPlayCard, type Card, getCompletedBuildPileCards, type GameState, type MoveResult } from '@skipbo/game-core';

import type { GameAction } from '@/state/gameActions';
import {
  PROTOCOL_VERSION,
  type CreateRoomResponse,
  type DisconnectedSeatInfo,
  type LobbyReadyState,
  type LobbySeatInfo,
  type RoomSummary,
  type ServerMessage,
} from '@klbsjpolp/realtime-core';
import { isDebugAction, SkipboHost, type ClientGameView, type HostRoomMeta } from '@skipbo/skipbo-runtime';

import { useCardAnimation } from '@/contexts/useCardAnimation';
import {
  setGlobalCompletedPileAnimationContext,
  triggerCompletedBuildPileAnimation,
} from '@/services/completedBuildPileAnimationService';
import { setGlobalDrawAnimationContext } from '@/services/drawAnimationService';
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

import { RECONNECT_DELAYS_MS, WEBSOCKET_PING_INTERVAL_MS } from '@/config/timing';
import {
  applyOptimisticDiscardView,
  applyOptimisticPlayView,
  cloneGameStateFromView,
  collectDrawTransitions,
  createPlaceholderGameState,
  getMaxDrawAnimationDuration,
  inferOpponentTransition,
  scheduleDrawAnimations,
  willPlayCardEmptyHand,
  type OpponentTransition,
  type TurnPresentationOverride,
} from '@/hooks/useOnlineSkipBoGame/helpers';

export { inferOpponentTransition, type OpponentTransition };

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/** Opaque blob the host stores on the server for its own reconnection. */
interface HostSnapshotPayload {
  state: GameState;
  activeSeatIndices: number[];
}

const toRoomMeta = (room: RoomSummary): HostRoomMeta => ({
  connectedSeats: room.connectedSeats,
  disconnectedSeats: room.disconnectedSeats,
  expiresAt: room.expiresAt,
  hostSeatIndex: room.hostSeatIndex,
  lobbySeats: room.lobbySeats,
  roomCode: room.roomCode,
  seatCapacity: room.seatCapacity,
  status: room.status,
  version: room.version,
});

export function useOnlineSkipBoGame(session: CreateRoomResponse | null) {
  const [view, setView] = useState<ClientGameView | null>(null);
  // Latest room/lobby summary. During WAITING there is no game view yet, so the
  // lobby UI is driven from `presence` alone.
  const [roomSummary, setRoomSummary] = useState<RoomSummary | null>(null);
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
  // Host-authoritative state. Only populated when the local seat is the host.
  const hostRef = useRef<SkipboHost | null>(null);
  const activeSeatIndicesRef = useRef<number[]>([]);
  const roomMetaRef = useRef<HostRoomMeta | null>(null);
  const lastBroadcastTurnRef = useRef<number | null>(null);
  // Duration (ms) of the local play/discard animation that the user just
  // started. When that action ends the turn, the next player's draw animation
  // is held back by this much so the acting player sees the same sequence
  // (own move first, then the next player drawing) that remote players see.
  const pendingLocalActionAnimationRef = useRef(0);
  const { removeAnimation, startAnimation, waitForAnimations } = useCardAnimation();

  const isHost = session != null && session.seatIndex === session.hostSeatIndex;

  const setInteractionLocked = useCallback((locked: boolean) => {
    interactionLockRef.current = locked;
  }, []);
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
  const clearTurnPresentationTimeout = useCallback(() => {
    if (turnPresentationTimeoutRef.current !== null) {
      window.clearTimeout(turnPresentationTimeoutRef.current);
      turnPresentationTimeoutRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Wire helpers
  // ---------------------------------------------------------------------------
  const sendRaw = useCallback((message: unknown): void => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    websocketRef.current.send(JSON.stringify(message));
  }, []);

  const sendRelay = useCallback(
    (kind: 'move' | 'event' | 'view', payload: unknown, toSeats?: number[]): void => {
      sendRaw({ type: 'relay', kind, payload, toSeats });
    },
    [sendRaw],
  );

  // ---------------------------------------------------------------------------
  // Rendering: ingest a redacted ClientGameView (host generates it; guests
  // receive it). This is the single rendering path for both roles — opponent
  // animation inference and optimistic reconciliation are unchanged.
  // ---------------------------------------------------------------------------
  const ingestView = useCallback(
    (incomingView: ClientGameView): void => {
      setInteractionLocked(false);
      setConnectionStatus('connected');
      setLastError(null);
      authoritativeViewRef.current = incomingView;

      // Consume the pending local-action duration: the next player's draw is
      // delayed by it only when the local player's move ended the turn.
      const localActionAnimationDuration = pendingLocalActionAnimationRef.current;
      pendingLocalActionAnimationRef.current = 0;

      if (incomingView.room.status === 'FINISHED' || incomingView.gameIsOver) {
        clearOnlineSession();
      }

      const previousView = viewRef.current;
      if (!previousView) {
        commitView(incomingView);
        return;
      }

      const previousState = cloneGameStateFromView(previousView);
      const nextState = cloneGameStateFromView(incomingView);
      const drawTransitions = collectDrawTransitions(previousState, nextState);
      const opponentTransition = inferOpponentTransition(previousState, nextState);
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
      const turnChanged = previousView.currentPlayerIndex !== incomingView.currentPlayerIndex;
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
        commitView(incomingView);
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
          Math.max(opponentAnimationDuration, getMaxDrawAnimationDuration(drawTransitions, opponentAnimationDuration)),
        );
      } else {
        // After the local player's own turn-ending discard, the authoritative
        // view advances the turn AND refills the next player's hand in one go.
        // Hold that draw until the local discard animation has finished so the
        // acting player sees the same sequence (own discard, then the next
        // player drawing) that remote players see.
        const drawBaseDelay = localActionAnimationDuration;
        const drawAnimationDuration = getMaxDrawAnimationDuration(drawTransitions, drawBaseDelay);
        if (drawAnimationDuration > 0) {
          holdPreviousTurnPresentation();
        }
        scheduleDrawAnimations(drawTransitions, drawBaseDelay);
        applyTurnPresentationDelay(drawAnimationDuration);
        commitView(incomingView);
      }
    },
    [clearTurnPresentationTimeout, commitView, setInteractionLocked],
  );

  // ---------------------------------------------------------------------------
  // Host authority: push each guest its redacted view, the abstract turn, the
  // reconnection snapshot, and the game-over signal.
  // ---------------------------------------------------------------------------
  const pushAuthority = useCallback((): void => {
    const host = hostRef.current;
    const meta = roomMetaRef.current;
    if (!host || !meta || !session) {
      return;
    }

    // Advance the server's abstract turn BEFORE relaying the views. Otherwise a
    // guest could receive a "your turn" view and fire a move that reaches the
    // server before its currentSeatIndex is updated — a spurious rejection.
    const currentTurn = host.gameIsOver ? null : host.currentSeatIndex();
    if (currentTurn !== null && currentTurn !== lastBroadcastTurnRef.current) {
      lastBroadcastTurnRef.current = currentTurn;
      sendRaw({ type: 'setTurn', currentSeatIndex: currentTurn });
    }

    for (const seat of activeSeatIndicesRef.current) {
      if (seat === session.seatIndex) {
        continue;
      }

      sendRelay('view', host.viewForSeat(seat, meta), [seat]);
    }

    const snapshot: HostSnapshotPayload = {
      state: host.serializeSnapshot(),
      activeSeatIndices: activeSeatIndicesRef.current,
    };
    sendRaw({ type: 'snapshot', payload: snapshot });

    if (host.gameIsOver) {
      sendRaw({ type: 'endGame', winnerSeatIndex: host.winnerSeatIndex() });
    }
  }, [sendRaw, sendRelay, session]);

  const applyHostAction = useCallback(
    (action: GameAction): void => {
      const host = hostRef.current;
      const meta = roomMetaRef.current;
      if (!host || !meta || !session) {
        return;
      }

      const result = host.applyMove(session.seatIndex, action);
      if (!result.ok) {
        setLastError(result.error ?? null);
        return;
      }

      ingestView(host.viewForSeat(session.seatIndex, meta));
      pushAuthority();
    },
    [ingestView, pushAuthority, session],
  );

  const sendAction = useCallback(
    (action: GameAction): void => {
      if (isHost) {
        applyHostAction(action);
        return;
      }

      if (isDebugAction(action)) {
        sendRelay('event', { move: action });
      } else {
        sendRelay('move', action);
      }
    },
    [applyHostAction, isHost, sendRelay],
  );

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

    if (!session) {
      setInteractionLocked(false);
      clearReconnectTimeout();
      clearPingInterval();
      clearTurnPresentationTimeout();
      websocketRef.current?.close();
      websocketRef.current = null;
      authoritativeViewRef.current = null;
      viewRef.current = null;
      hostRef.current = null;
      roomMetaRef.current = null;
      activeSeatIndicesRef.current = [];
      lastBroadcastTurnRef.current = null;
      return;
    }

    const activeSession = session;
    const localIsHost = activeSession.seatIndex === activeSession.hostSeatIndex;
    authoritativeViewRef.current = null;
    viewRef.current = null;
    intentionalLeaveRef.current = false;
    hostRef.current = null;
    roomMetaRef.current = null;
    activeSeatIndicesRef.current = [];
    lastBroadcastTurnRef.current = null;

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

      const currentSocket = new WebSocket(activeSession.wsUrl);
      socket = currentSocket;
      websocketRef.current = currentSocket;
      // Guests request a fresh view from the host once per socket (covers
      // reconnect mid-game; the host has no other way to know we came back).
      let resyncRequested = false;

      currentSocket.addEventListener('open', () => {
        if (!isCurrentSocket(currentSocket)) {
          return;
        }

        reconnectAttempt = 0;
        currentSocket.send(
          JSON.stringify({
            type: 'auth',
            protocolVersion: PROTOCOL_VERSION,
            roomCode: activeSession.roomCode,
            seatIndex: activeSession.seatIndex,
            seatToken: activeSession.seatToken,
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
            case 'gameStarted': {
              setInteractionLocked(false);
              setConnectionStatus('connected');
              setLastError(null);
              activeSeatIndicesRef.current = message.activeSeatIndices;
              lastBroadcastTurnRef.current = message.currentSeatIndex;

              if (localIsHost) {
                const meta = roomMetaRef.current;
                const stockSize = (message.gameConfig as { stockSize?: number } | undefined)?.stockSize;
                const playerNames = message.activeSeatIndices.map(
                  (seat) => meta?.lobbySeats?.find((s) => s.seatIndex === seat)?.displayName ?? undefined,
                );
                const host = SkipboHost.create({
                  activeSeatIndices: message.activeSeatIndices,
                  allowDebug: import.meta.env.DEV,
                  playerNames,
                  stockSize,
                });
                hostRef.current = host;

                if (meta) {
                  ingestView(host.viewForSeat(activeSession.seatIndex, meta));
                  for (const seat of message.activeSeatIndices) {
                    if (seat !== activeSession.seatIndex) {
                      sendRelay('view', host.viewForSeat(seat, meta), [seat]);
                    }
                  }
                  const snapshot: HostSnapshotPayload = {
                    state: host.serializeSnapshot(),
                    activeSeatIndices: message.activeSeatIndices,
                  };
                  sendRaw({ type: 'snapshot', payload: snapshot });
                }
              }
              break;
            }
            case 'snapshotRestore': {
              if (localIsHost && message.payload) {
                const payload = message.payload as HostSnapshotPayload;
                activeSeatIndicesRef.current = payload.activeSeatIndices;
                const host = SkipboHost.fromSnapshot(payload.state, payload.activeSeatIndices, import.meta.env.DEV);
                hostRef.current = host;
                lastBroadcastTurnRef.current = host.gameIsOver ? null : host.currentSeatIndex();
                const meta = roomMetaRef.current;
                if (meta) {
                  ingestView(host.viewForSeat(activeSession.seatIndex, meta));
                  for (const seat of payload.activeSeatIndices) {
                    if (seat !== activeSession.seatIndex) {
                      sendRelay('view', host.viewForSeat(seat, meta), [seat]);
                    }
                  }
                }
              }
              break;
            }
            case 'relayed': {
              if (localIsHost) {
                const host = hostRef.current;
                const meta = roomMetaRef.current;
                if (!host || !meta) {
                  break;
                }

                if (message.kind === 'move') {
                  const result = host.applyMove(message.fromSeat, message.payload as GameAction);
                  if (result.ok) {
                    ingestView(host.viewForSeat(activeSession.seatIndex, meta));
                    pushAuthority();
                  } else {
                    // Correct the offending guest with its authoritative view.
                    sendRelay('view', host.viewForSeat(message.fromSeat, meta), [message.fromSeat]);
                  }
                } else if (message.kind === 'event') {
                  const payload = message.payload as { resync?: boolean; move?: GameAction } | null;
                  if (payload?.resync) {
                    sendRelay('view', host.viewForSeat(message.fromSeat, meta), [message.fromSeat]);
                  } else if (payload?.move) {
                    const result = host.applyMove(message.fromSeat, payload.move);
                    if (result.ok) {
                      ingestView(host.viewForSeat(activeSession.seatIndex, meta));
                      pushAuthority();
                    }
                  }
                }
                // Host ignores relayed 'view'.
              } else if (message.kind === 'view') {
                ingestView(message.payload as ClientGameView);
              }
              break;
            }
            case 'turn':
              // Views carry the current player; nothing extra to do.
              break;
            case 'presence': {
              setConnectionStatus('connected');
              roomMetaRef.current = toRoomMeta(message.room);
              setRoomSummary(message.room);
              if (message.room.status === 'FINISHED') {
                clearOnlineSession();
              }
              authoritativeViewRef.current = authoritativeViewRef.current
                ? { ...authoritativeViewRef.current, room: message.room }
                : authoritativeViewRef.current;
              updateView((previousView) => (previousView ? { ...previousView, room: message.room } : previousView));

              // Guest reconnecting into a running game: ask the host for our view.
              if (!localIsHost && message.room.status === 'ACTIVE' && !resyncRequested) {
                resyncRequested = true;
                sendRelay('event', { resync: true });
              }
              break;
            }
            case 'actionRejected': {
              setInteractionLocked(false);
              const knownStatus = authoritativeViewRef.current?.room.status ?? roomMetaRef.current?.status ?? null;
              if (knownStatus === null) {
                intentionalLeaveRef.current = true;
                clearOnlineSession();
                setLastError(message.reason);
                currentSocket.close();
              } else if (knownStatus === 'WAITING') {
                intentionalLeaveRef.current = true;
                currentSocket.close();
                setLobbyRemovalReason('kicked');
              } else {
                setLastError(message.reason);
                commitView(authoritativeViewRef.current ?? viewRef.current);
              }
              break;
            }
            case 'roomClosed':
              setInteractionLocked(false);
              clearOnlineSession();
              if (message.status === 'WAITING' || authoritativeViewRef.current?.room.status === 'WAITING') {
                setLobbyRemovalReason('host-left');
              }
              setRoomSummary((previous) => (previous ? { ...previous, status: message.status } : previous));
              authoritativeViewRef.current = authoritativeViewRef.current
                ? {
                    ...authoritativeViewRef.current,
                    room: { ...authoritativeViewRef.current.room, status: message.status },
                  }
                : authoritativeViewRef.current;
              updateView((previousView) =>
                previousView
                  ? { ...previousView, room: { ...previousView.room, status: message.status } }
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
      clearTurnPresentationTimeout();

      if (websocketRef.current === socket) {
        websocketRef.current = null;
      }

      setInteractionLocked(false);

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [
    clearTurnPresentationTimeout,
    commitView,
    ingestView,
    pushAuthority,
    sendRaw,
    sendRelay,
    session,
    setInteractionLocked,
    updateView,
  ]);

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

  const debugFillBuildPile = useCallback(
    (buildPile: number): void => {
      sendAction({ type: 'DEBUG_FILL_BUILD_PILE', buildPile });
    },
    [sendAction],
  );

  const debugFillHandSkipBo = useCallback((): void => {
    sendAction({ type: 'DEBUG_FILL_HAND_SKIPBO' });
  }, [sendAction]);

  const debugClearStockPile = useCallback((): void => {
    sendAction({ type: 'DEBUG_CLEAR_STOCK_PILE' });
  }, [sendAction]);

  const debugClearAiStockPile = useCallback((): void => {
    sendAction({ type: 'DEBUG_CLEAR_AI_STOCK_PILE' });
  }, [sendAction]);

  const debugWin = useCallback((): void => {
    sendAction({ type: 'DEBUG_WIN' });
  }, [sendAction]);

  const startGame = useCallback(() => {
    sendRaw({ type: 'startGame', clientVersion: roomMetaRef.current?.version ?? viewRef.current?.room.version });
  }, [sendRaw]);

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
              selectedCard: { card, source, index, discardPileIndex },
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
      previousView ? { ...previousView, message: "C'est votre tour", selectedCard: null } : previousView,
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

          if (dragOverride?.startPosition) {
            startPosition = dragOverride.startPosition;
            startAngleDeg = undefined;
          }

          const endPosition = getBuildPilePosition(centerAreaElement, buildPile);

          if (startPosition) {
            playAnimationDuration = calculateAnimationDuration(startPosition, endPosition) * 1.2;
            // When this play completes the pile, the committed state clears the
            // build pile (length 0). targetPileLength must reflect that committed
            // length so CenterArea masks the in-flight card with the pre-completion
            // backdrop instead of painting the final card on the pile early.
            const previousBuildPileLength = currentState.buildPiles[buildPile].length;
            const settledBuildPileLength = completedBuildPileCards ? 0 : previousBuildPileLength + 1;
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
              targetPileLength: settledBuildPileLength,
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

        const dragOverride = consumeDragCommitOverride();
        let discardAnimationDuration = 0;

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
                discardAnimationDuration = animationDuration;
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

        // A discard ends the turn; hold the next player's draw until this
        // discard animation finishes (consumed by the next ingestView).
        pendingLocalActionAnimationRef.current = discardAnimationDuration;
        sendAction({ type: 'DISCARD_CARD', discardPile });
        setInteractionLocked(false);
        resolve({ success: true, message: 'Carte défaussée' });
      }),
    [commitView, isInteractionBlocked, sendAction, setInteractionLocked, startAnimation],
  );

  const sendSetReady = useCallback(
    (playerName?: string): void => {
      sendRaw({ type: 'setReady', playerName });
    },
    [sendRaw],
  );

  const sendSetUnready = useCallback((): void => {
    sendRaw({ type: 'setUnready' });
  }, [sendRaw]);

  const kickSeat = useCallback(
    (targetSeatIndex: number): void => {
      sendRaw({ type: 'kickSeat', targetSeatIndex });
    },
    [sendRaw],
  );

  const leaveLobby = useCallback((): void => {
    intentionalLeaveRef.current = true;
    sendRaw({ type: 'leaveLobby' });
  }, [sendRaw]);

  // Ignore a summary left over from a previous room (session change before the
  // first presence of the new room arrives).
  const room = view?.room ?? (roomSummary && roomSummary.roomCode === session?.roomCode ? roomSummary : null);
  const playersBySeatIndex: Record<number, { displayName: string; seatIndex: number }> = {};
  view?.players.forEach((player) => {
    if (typeof player.seatIndex === 'number') {
      playersBySeatIndex[player.seatIndex] = { displayName: player.displayName, seatIndex: player.seatIndex };
    }
  });
  room?.lobbySeats.forEach((seat) => {
    if (!playersBySeatIndex[seat.seatIndex] && seat.displayName) {
      playersBySeatIndex[seat.seatIndex] = { displayName: seat.displayName, seatIndex: seat.seatIndex };
    }
  });

  const seatCapacity = room?.seatCapacity ?? session?.seatCapacity ?? 4;
  const hostSeatIndex = room?.hostSeatIndex ?? session?.hostSeatIndex ?? 0;
  const connectedSeats = room?.connectedSeats ?? [];
  const disconnectedSeats: DisconnectedSeatInfo[] = room?.disconnectedSeats ?? [];
  const lobbySeats: LobbySeatInfo[] = room?.lobbySeats ?? [];
  const roomStatus = room?.status ?? 'WAITING';
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
    debugClearStockPile,
    debugClearAiStockPile,
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
    roomCode: room?.roomCode ?? session?.roomCode ?? '',
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
