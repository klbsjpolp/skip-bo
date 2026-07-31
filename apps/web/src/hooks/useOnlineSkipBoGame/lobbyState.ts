import type {
  CreateRoomResponse,
  DisconnectedSeatInfo,
  LobbyReadyState,
  LobbySeatInfo,
  RoomSummary,
} from '@klbsjpolp/realtime-core';
import type { ClientGameView } from '@skipbo/skipbo-runtime';

export interface SeatDisplayInfo {
  displayName: string;
  seatIndex: number;
}

export interface LobbyState {
  canStartGame: boolean;
  connectedSeats: number[];
  disconnectedSeats: DisconnectedSeatInfo[];
  hostSeatIndex: number;
  isLocalHost: boolean;
  lobbySeats: LobbySeatInfo[];
  myReadyState: LobbyReadyState;
  playersBySeatIndex: Record<number, SeatDisplayInfo>;
  roomCode: string;
  roomStatus: RoomSummary['status'];
  seatCapacity: number;
}

/**
 * Pick the room summary to render from. The game view wins when present; a
 * `presence`-derived summary fills in during WAITING (there is no view yet).
 * A summary left over from a previous room — session changed before the new
 * room's first presence arrived — is ignored.
 */
export const selectRoomSummary = (
  view: ClientGameView | null,
  roomSummary: RoomSummary | null,
  session: CreateRoomResponse | null,
): RoomSummary | null => view?.room ?? (roomSummary && roomSummary.roomCode === session?.roomCode ? roomSummary : null);

/**
 * Seat -> display name, preferring the in-game player list and falling back to
 * the lobby seats (which is all there is before the game starts).
 */
export const collectSeatDisplayNames = (
  view: ClientGameView | null,
  room: RoomSummary | null,
): Record<number, SeatDisplayInfo> => {
  const playersBySeatIndex: Record<number, SeatDisplayInfo> = {};

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

  return playersBySeatIndex;
};

/** The host may start once the room is still WAITING and every connected seat is ready. */
export const canStartGame = (
  isLocalHost: boolean,
  roomStatus: RoomSummary['status'],
  connectedSeats: number[],
  lobbySeats: LobbySeatInfo[],
): boolean =>
  isLocalHost &&
  roomStatus === 'WAITING' &&
  connectedSeats.length >= 2 &&
  connectedSeats.every((seatIndex) => lobbySeats.find((s) => s.seatIndex === seatIndex)?.readyState === 'ready');

/**
 * Everything the lobby UI reads, derived from the latest view / presence
 * summary / session. Pure: same inputs, same output.
 */
export const deriveLobbyState = (
  view: ClientGameView | null,
  roomSummary: RoomSummary | null,
  session: CreateRoomResponse | null,
): LobbyState => {
  const room = selectRoomSummary(view, roomSummary, session);

  const hostSeatIndex = room?.hostSeatIndex ?? session?.hostSeatIndex ?? 0;
  const connectedSeats = room?.connectedSeats ?? [];
  const lobbySeats: LobbySeatInfo[] = room?.lobbySeats ?? [];
  const roomStatus = room?.status ?? 'WAITING';
  const isLocalHost = session?.seatIndex === hostSeatIndex;

  return {
    canStartGame: canStartGame(isLocalHost, roomStatus, connectedSeats, lobbySeats),
    connectedSeats,
    disconnectedSeats: room?.disconnectedSeats ?? [],
    hostSeatIndex,
    isLocalHost,
    lobbySeats,
    myReadyState: lobbySeats.find((s) => s.seatIndex === session?.seatIndex)?.readyState ?? 'never-ready',
    playersBySeatIndex: collectSeatDisplayNames(view, room),
    roomCode: room?.roomCode ?? session?.roomCode ?? '',
    roomStatus,
    seatCapacity: room?.seatCapacity ?? session?.seatCapacity ?? 4,
  };
};
