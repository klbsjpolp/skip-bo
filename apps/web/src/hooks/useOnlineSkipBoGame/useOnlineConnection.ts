import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';

import {
  PROTOCOL_VERSION,
  type CreateRoomResponse,
  type RoomSummary,
  type ServerMessage,
} from '@klbsjpolp/realtime-core';
import { SkipboHost, type ClientGameView, type HostRoomMeta } from '@skipbo/skipbo-runtime';

import type { GameAction } from '@/state/gameActions';
import { RECONNECT_DELAYS_MS, WEBSOCKET_PING_INTERVAL_MS } from '@/config/timing';
import { clearOnlineSession } from '@/state/sessionPersistence';

import { toRoomMeta, type ConnectionStatus, type HostSnapshotPayload } from './types';

/**
 * Everything the connection layer needs from the owning hook. The shared state,
 * refs, and send/host-orchestration callbacks live in `useOnlineSkipBoGame`; this
 * hook owns only the WebSocket lifecycle (connect / ping / reconnect) and routes
 * incoming server messages back through these collaborators.
 */
export interface UseOnlineConnectionParams {
  session: CreateRoomResponse | null;
  // Shared refs owned by the host hook.
  websocketRef: RefObject<WebSocket | null>;
  authoritativeViewRef: RefObject<ClientGameView | null>;
  viewRef: RefObject<ClientGameView | null>;
  hostRef: RefObject<SkipboHost | null>;
  roomMetaRef: RefObject<HostRoomMeta | null>;
  activeSeatIndicesRef: RefObject<number[]>;
  lastBroadcastTurnRef: RefObject<number | null>;
  intentionalLeaveRef: RefObject<boolean>;
  // Collaborators owned by the host hook.
  setInteractionLocked: (locked: boolean) => void;
  clearTurnPresentationTimeout: () => void;
  ingestView: (incomingView: ClientGameView) => void;
  pushAuthority: () => void;
  sendRaw: (message: unknown) => void;
  sendRelay: (kind: 'move' | 'event' | 'view', payload: unknown, toSeats?: number[]) => void;
  commitView: (nextView: ClientGameView | null) => void;
  updateView: (updater: (currentView: ClientGameView | null) => ClientGameView | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (error: string | null) => void;
  setRoomSummary: Dispatch<SetStateAction<RoomSummary | null>>;
  setLobbyRemovalReason: (reason: 'host-left' | 'kicked' | null) => void;
}

/**
 * Owns the WebSocket lifecycle for an online session: opening the socket,
 * authenticating, the ping keepalive, exponential-backoff reconnect, and routing
 * each `ServerMessage` to the host hook's collaborators. Re-runs only when the
 * session changes; the collaborators are read through a synced ref so a re-render
 * does not tear down a live socket.
 */
export function useOnlineConnection(params: UseOnlineConnectionParams): void {
  const { session } = params;

  // Keep the latest collaborators reachable from the socket callbacks without
  // making them effect dependencies (they are all stable, and the socket must
  // survive re-renders). Synced in an effect, never during render.
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  // Owned entirely by the connection lifecycle below.
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const {
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
      pushAuthority,
      sendRaw,
      sendRelay,
      commitView,
      updateView,
      setConnectionStatus,
      setLastError,
      setRoomSummary,
      setLobbyRemovalReason,
    } = paramsRef.current;

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
    // Collaborators are read from paramsRef (stable); only the session identity
    // should tear down and rebuild the socket.
  }, [session]);
}
