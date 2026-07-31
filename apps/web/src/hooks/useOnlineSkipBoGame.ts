import { useCallback, useMemo, useRef, useState } from 'react';

import { canPlayCard, type GameAction, type MoveResult } from '@skipbo/game-core';

import type { GameStatsRecord } from '@/monitoring/gameStats';
import { type CreateRoomResponse, type RoomSummary } from '@klbsjpolp/realtime-core';
import { isDebugAction, type ClientGameView, type HostRoomMeta, type SkipboHost } from '@skipbo/skipbo-runtime';

import { useCardAnimation } from '@/contexts/useCardAnimation';
import { clearOnlineSession } from '@/state/sessionPersistence';

import {
  applyOptimisticDiscardView,
  applyOptimisticPlayView,
  cloneGameStateFromView,
  collectDrawTransitions,
  createPlaceholderGameState,
  getMaxDrawAnimationDuration,
  inferOpponentTransition,
  mergeOpponentRefillTransition,
  resolveSelectableCard,
  scheduleDrawAnimations,
  type OpponentTransition,
  type TurnPresentationOverride,
} from '@/hooks/useOnlineSkipBoGame/helpers';
import { deriveLobbyState } from '@/hooks/useOnlineSkipBoGame/lobbyState';
import { createViewEchoTracker } from '@/hooks/useOnlineSkipBoGame/viewEchoes';
import { useDebugActions } from '@/game/debugActions';
import { preparePlayCardIntent, prepareDiscardCardIntent } from '@/game/moveIntents';
import { startDiscardCardAnimation, startPlayCardAnimation } from '@/game/moveAnimations';
import { type ConnectionStatus, type HostSnapshotPayload } from '@/hooks/useOnlineSkipBoGame/types';
import { useOnlineConnection } from '@/hooks/useOnlineSkipBoGame/useOnlineConnection';

export { inferOpponentTransition, type OpponentTransition };

export function useOnlineSkipBoGame(session: CreateRoomResponse | null) {
  const [view, setView] = useState<ClientGameView | null>(null);
  // Latest room/lobby summary. During WAITING there is no game view yet, so the
  // lobby UI is driven from `presence` alone.
  const [roomSummary, setRoomSummary] = useState<RoomSummary | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [turnPresentationOverride, setTurnPresentationOverride] = useState<TurnPresentationOverride | null>(null);
  const [lobbyRemovalReason, setLobbyRemovalReason] = useState<'host-left' | 'kicked' | null>(null);
  // The host-computed, authoritative end-of-game stats record, relayed to every
  // guest so all seats display identical numbers (see `broadcastGameStats`).
  const [receivedGameStats, setReceivedGameStats] = useState<GameStatsRecord | null>(null);
  const authoritativeViewRef = useRef<ClientGameView | null>(null);
  const interactionLockRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const viewRef = useRef<ClientGameView | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
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
  // Guest only: tracks the authoritative view echoes the host still owes us for
  // moves already applied optimistically. See viewEchoes.ts for the rules.
  const viewEchoesRef = useRef(createViewEchoTracker());
  const { driver } = useCardAnimation();

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
  const sendRaw = useCallback((message: unknown): boolean => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    websocketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  const sendRelay = useCallback(
    (kind: 'move' | 'event' | 'view', payload: unknown, toSeats?: number[]): boolean =>
      sendRaw({ type: 'relay', kind, payload, toSeats }),
    [sendRaw],
  );

  // The host computes end-of-game stats from its own state — no network delay,
  // no risk of missing an intermediate view — so it is the only trustworthy
  // source. Broadcast the finalized record to every other seat (defaults to
  // all other seats) so guests display and persist the same numbers instead of
  // reconstructing an approximation from asynchronously-delivered views.
  const broadcastGameStats = useCallback(
    (record: GameStatsRecord): void => {
      sendRelay('event', { gameStats: record });
    },
    [sendRelay],
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
      if (opponentTransition) {
        mergeOpponentRefillTransition(drawTransitions, previousState, nextState);
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
        const opponentAnimationDuration = driver.animateMove(previousState, opponentTransition.action, {
          cardOverride: opponentTransition.animationCard,
          sourceRevealedOverride: opponentTransition.sourceRevealed,
          targetSettledInStateOverride: true,
          targetPileLengthOverride: opponentTransition.targetPileLength,
          targetRevealedOverride: true,
        });
        if (opponentTransition.completedCards && opponentTransition.completedBuildPileIndex !== undefined) {
          driver.animateCompletion(
            previousState,
            opponentTransition.completedBuildPileIndex,
            opponentTransition.completedCards,
            previousState.completedBuildPiles.length,
            100,
            opponentAnimationDuration,
          );
        }

        scheduleDrawAnimations(driver, drawTransitions, opponentAnimationDuration);
        applyTurnPresentationDelay(
          Math.max(
            opponentAnimationDuration,
            getMaxDrawAnimationDuration(driver, drawTransitions, opponentAnimationDuration),
          ),
        );
      } else {
        // After the local player's own turn-ending discard, the authoritative
        // view advances the turn AND refills the next player's hand in one go.
        // Hold that draw until the local discard animation has finished so the
        // acting player sees the same sequence (own discard, then the next
        // player drawing) that remote players see.
        const drawBaseDelay = localActionAnimationDuration;
        const drawAnimationDuration = getMaxDrawAnimationDuration(driver, drawTransitions, drawBaseDelay);
        if (drawAnimationDuration > 0) {
          holdPreviousTurnPresentation();
        }
        scheduleDrawAnimations(driver, drawTransitions, drawBaseDelay);
        applyTurnPresentationDelay(drawAnimationDuration);
        commitView(incomingView);
      }
    },
    [clearTurnPresentationTimeout, commitView, driver, setInteractionLocked],
  );

  // Guest entry point for views relayed by the host. Drops stale echoes (see
  // viewEchoes.ts); everything else flows into ingestView unchanged.
  const ingestRelayedView = useCallback(
    (incomingView: ClientGameView): void => {
      if (!viewEchoesRef.current.shouldRender()) {
        // Stale echo: a newer view reflecting our latest move is on its way.
        // Record it as the authoritative fallback (actionRejected recovery)
        // without rendering it.
        authoritativeViewRef.current = incomingView;
        return;
      }

      ingestView(incomingView);
    },
    [ingestView],
  );

  const resetPendingViewEchoes = useCallback((): void => {
    viewEchoesRef.current.reset();
  }, []);

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
      } else if (sendRelay('move', action)) {
        // The host will echo exactly one view for this move; count it so
        // ingestRelayedView can skip echoes that predate later local moves.
        viewEchoesRef.current.expectEcho();
      }
    },
    [applyHostAction, isHost, sendRelay],
  );

  // Owns the WebSocket lifecycle (connect / ping / reconnect) and routes server
  // messages back through the collaborators below. All shared state and host
  // orchestration stay here; only the socket plumbing lives in the connection hook.
  useOnlineConnection({
    session,
    websocketRef,
    authoritativeViewRef,
    viewRef,
    hostRef,
    roomMetaRef,
    activeSeatIndicesRef,
    lastBroadcastTurnRef,
    intentionalLeaveRef,
    setInteractionLocked,
    clearTurnPresentationTimeout,
    ingestView,
    ingestRelayedView,
    resetPendingViewEchoes,
    pushAuthority,
    sendRaw,
    sendRelay,
    commitView,
    updateView,
    setConnectionStatus,
    setLastError,
    setRoomSummary,
    setLobbyRemovalReason,
    setReceivedGameStats,
  });

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

  const { debugFillBuildPile, debugFillHandSkipBo, debugClearStockPile, debugClearAiStockPile, debugWin } =
    useDebugActions(sendAction);

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

      const card = resolveSelectableCard(player, source, index, discardPileIndex);
      if (!card) {
        return;
      }

      updateView((previousView) =>
        previousView
          ? {
              ...previousView,
              message: { code: 'SELECT_DESTINATION' as const },
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
      previousView ? { ...previousView, message: { code: 'YOUR_TURN' as const }, selectedCard: null } : previousView,
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

      if (isInteractionBlocked()) {
        return { success: false, message: 'Action en cours' };
      }

      const intent = preparePlayCardIntent(currentState, buildPile);
      if (!intent.valid) {
        return { success: false, message: intent.error };
      }

      setInteractionLocked(true);

      startPlayCardAnimation(currentState, buildPile, intent.completedBuildPileCards, driver);

      if (viewRef.current) {
        commitView(applyOptimisticPlayView(viewRef.current, buildPile, intent.willEmptyHand));
      }

      sendAction({ type: 'PLAY_CARD', buildPile });
      setInteractionLocked(false);
      return { success: true, message: 'Carte jouée' };
    },
    [commitView, driver, isInteractionBlocked, sendAction, setInteractionLocked],
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

        const intent = prepareDiscardCardIntent(currentState);
        if (!intent.valid) {
          resolve({ success: false, message: intent.error });
          return;
        }

        setInteractionLocked(true);

        const discardAnimationDuration = startDiscardCardAnimation(currentState, discardPile, driver);

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
    [commitView, driver, isInteractionBlocked, sendAction, setInteractionLocked],
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

  const {
    canStartGame,
    connectedSeats,
    disconnectedSeats,
    hostSeatIndex,
    isLocalHost,
    lobbySeats,
    myReadyState,
    playersBySeatIndex,
    roomCode,
    roomStatus,
    seatCapacity,
  } = deriveLobbyState(view, roomSummary, session);

  return {
    broadcastGameStats,
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
    receivedGameStats,
    // True once a real server view has been ingested. Until then `gameState`
    // is the seat-capacity placeholder, which must not be recorded as a game.
    hasGameView: view !== null,
    hostSeatIndex,
    isLocalHost,
    kickSeat,
    lastError,
    leaveLobby,
    lobbySeats,
    myReadyState,
    playCard,
    playersBySeatIndex,
    roomCode,
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
