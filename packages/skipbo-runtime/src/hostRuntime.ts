import type { GameAction, GameState } from '@skipbo/game-core';

import { applyOnlineAction, createOnlineInitialGameState, isDebugAction, validateOnlineAction } from './gameLogic.js';
import { serializeClientGameView, type ClientGameView } from './views.js';

/**
 * Room metadata the host needs to render a full ClientGameView. The host owns
 * the game state; everything here comes from the server's presence/room updates.
 */
export interface HostRoomMeta {
  connectedSeats: number[];
  disconnectedSeats?: { seatIndex: number; disconnectedAt: string }[];
  expiresAt: string;
  hostSeatIndex: number;
  lobbySeats?: { seatIndex: number; readyState: 'never-ready' | 'ready' | 'unready'; displayName: string | null }[];
  roomCode: string;
  seatCapacity: number;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  version: number;
}

export interface ApplyMoveResult {
  ok: boolean;
  error?: string;
}

export interface SkipboHostOptions {
  activeSeatIndices: number[];
  /** Allow DEBUG_* actions (host enables only in non-production builds). */
  allowDebug?: boolean;
  playerNames?: Array<string | undefined>;
  stockSize?: number;
}

/**
 * Host-authoritative Skip-Bo runtime. Owns the full game state and the mapping
 * between abstract seat indices and the game's player-array order. The web host
 * client drives it: feed it relayed moves, read back per-seat redacted views.
 */
export class SkipboHost {
  private state: GameState;
  private readonly activeSeatIndices: number[];
  private readonly allowDebug: boolean;

  private constructor(state: GameState, activeSeatIndices: number[], allowDebug: boolean) {
    this.state = state;
    this.activeSeatIndices = [...activeSeatIndices];
    this.allowDebug = allowDebug;
  }

  static create({ activeSeatIndices, allowDebug = false, playerNames, stockSize }: SkipboHostOptions): SkipboHost {
    const state = createOnlineInitialGameState({
      playerCount: activeSeatIndices.length,
      playerNames,
      seatIndices: activeSeatIndices,
      stockSize,
    });

    return new SkipboHost(state, activeSeatIndices, allowDebug);
  }

  /** Rebuild a host runtime from a previously serialized full-state snapshot. */
  static fromSnapshot(snapshot: GameState, activeSeatIndices: number[], allowDebug = false): SkipboHost {
    return new SkipboHost(snapshot, activeSeatIndices, allowDebug);
  }

  /** Opaque full-state blob to push to the server for host reconnection. */
  serializeSnapshot(): GameState {
    return this.state;
  }

  getState(): GameState {
    return this.state;
  }

  seatToPlayerIndex(seatIndex: number): number {
    return this.activeSeatIndices.indexOf(seatIndex);
  }

  playerIndexToSeat(playerIndex: number): number {
    return this.activeSeatIndices[playerIndex];
  }

  /** Abstract seat whose turn it currently is. */
  currentSeatIndex(): number {
    return this.activeSeatIndices[this.state.currentPlayerIndex];
  }

  get gameIsOver(): boolean {
    return this.state.gameIsOver;
  }

  /** Winning seat index, or null while the game is ongoing. */
  winnerSeatIndex(): number | null {
    return this.state.winnerIndex === null ? null : this.activeSeatIndices[this.state.winnerIndex];
  }

  /**
   * Validate and apply a move sent by `seatIndex`. Enforces turn ownership
   * (except for debug actions) and Skip-Bo legality. Mutates internal state on
   * success.
   */
  applyMove(seatIndex: number, action: GameAction): ApplyMoveResult {
    const playerIndex = this.seatToPlayerIndex(seatIndex);

    if (playerIndex < 0) {
      return { ok: false, error: 'Seat is not active in this room' };
    }

    if (this.state.currentPlayerIndex !== playerIndex && !isDebugAction(action)) {
      return { ok: false, error: 'It is not your turn' };
    }

    const validationError = validateOnlineAction(this.state, action, this.allowDebug);

    if (validationError) {
      return { ok: false, error: validationError };
    }

    this.state = applyOnlineAction(this.state, action);
    return { ok: true };
  }

  /** Redacted, viewer-relative view for a single seat. */
  viewForSeat(seatIndex: number, room: HostRoomMeta): ClientGameView {
    return serializeClientGameView({
      connectedSeats: room.connectedSeats,
      currentSeatIndex: this.state.gameIsOver ? null : this.currentSeatIndex(),
      disconnectedSeats: room.disconnectedSeats,
      expiresAt: room.expiresAt,
      gameState: this.state,
      hostSeatIndex: room.hostSeatIndex,
      lobbySeats: room.lobbySeats,
      roomCode: room.roomCode,
      seatCapacity: room.seatCapacity,
      status: room.status,
      version: room.version,
      // serializeClientGameView rotates by the viewer's player-array index, not
      // the abstract seat index.
      viewerSeatIndex: this.seatToPlayerIndex(seatIndex),
    });
  }
}
