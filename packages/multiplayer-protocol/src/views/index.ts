import type { Card, GameConfig, GameState, Player, SelectedCard } from '@skipbo/game-core';

import { getDefaultPlayerName, normalizePlayerName } from '../playerName.js';

export type RoomStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';

export interface PlayerView extends Player {
  displayName: string;
  isHandVisible: boolean;
  relativeSeatIndex: number;
  role: 'local' | 'opponent';
}

export interface SelectedCardView extends SelectedCard {
  isHidden?: boolean;
}

export interface RoomSummary {
  connectedSeats: number[];
  expiresAt: string;
  hostSeatIndex: number;
  roomCode: string;
  seatCapacity: number;
  status: RoomStatus;
  version: number;
}

export interface ClientGameView {
  buildPiles: Card[][];
  completedBuildPiles: Card[];
  config: GameConfig;
  currentPlayerIndex: number;
  deck: Card[];
  gameIsOver: boolean;
  message: string;
  players: PlayerView[];
  room: RoomSummary;
  selectedCard: SelectedCardView | null;
  winnerIndex: number | null;
}

export interface SerializeClientGameViewInput {
  connectedSeats: number[];
  expiresAt: string;
  gameState: GameState;
  hostSeatIndex?: number;
  roomCode: string;
  seatCapacity?: number;
  status: RoomStatus;
  version: number;
  viewerSeatIndex: number;
}

export const HIDDEN_CARD: Card = {
  value: 0,
  isSkipBo: false,
};

const OPPONENT_VISIBLE_STOCK_CARDS = 1;

const cloneCard = (card: Card): Card => ({ ...card });

const redactDeck = (deck: Card[]): Card[] => deck.map(() => ({ ...HIDDEN_CARD }));

const revealStockPile = (stockPile: Card[]): Card[] =>
  stockPile.map(cloneCard);

const redactStockPile = (stockPile: Card[], visibleCount: number): Card[] => {
  if (stockPile.length === 0) {
    return [];
  }

  return stockPile.map((card, index) =>
    index >= stockPile.length - visibleCount ? cloneCard(card) : { ...HIDDEN_CARD },
  );
};

const redactHand = (hand: (Card | null)[], isVisible: boolean): (Card | null)[] =>
  hand.map((card) => {
    if (!card) {
      return null;
    }

    return isVisible ? cloneCard(card) : { ...HIDDEN_CARD };
  });

const rotateIndex = (index: number | null, viewerSeatIndex: number, playerCount: number): number | null => {
  if (index === null) {
    return null;
  }

  return ((index - viewerSeatIndex) + playerCount) % playerCount;
};

const getPlayerDisplayName = (
  player: Player,
  role: 'local' | 'opponent',
  relativeSeatIndex: number,
  seatIndex: number | undefined,
  playerCount: number,
): string => {
  const explicitName = normalizePlayerName(player.name);

  if (explicitName) {
    return explicitName;
  }

  if (seatIndex !== undefined) {
    return getDefaultPlayerName(seatIndex);
  }

  if (role === 'local') {
    return 'Vous';
  }

  return playerCount === 2 ? 'Adversaire' : `Adversaire ${relativeSeatIndex}`;
};

const getViewMessage = (
  gameState: GameState,
  viewerSeatIndex: number,
  status: RoomStatus,
  connectedSeats: number[],
  players: PlayerView[],
): string => {
  const playerCount = gameState.players.length;
  const rotatedWinnerIndex = rotateIndex(gameState.winnerIndex, viewerSeatIndex, playerCount);
  const rotatedCurrentPlayerIndex = rotateIndex(gameState.currentPlayerIndex, viewerSeatIndex, playerCount) ?? 0;

  if (status === 'WAITING') {
    return connectedSeats.length < 2
      ? 'En attente d’au moins un autre joueur'
      : 'En attente du démarrage';
  }

  if (gameState.gameIsOver) {
    if (rotatedWinnerIndex === 0) return 'Vous avez gagné !';
    const winnerName = rotatedWinnerIndex !== null ? players[rotatedWinnerIndex]?.displayName : undefined;
    return winnerName ? `${winnerName} a gagné.` : 'Un adversaire a gagné.';
  }

  if (rotatedCurrentPlayerIndex === 0) {
    return gameState.selectedCard ? 'Sélectionnez une destination' : "C’est votre tour";
  }

  const currentPlayerName = players[rotatedCurrentPlayerIndex]?.displayName;
  return currentPlayerName ? `Tour de ${currentPlayerName}` : "Tour d’un adversaire";
};

const toSelectedCardView = (
  selectedCard: SelectedCard | null,
  viewerSeatIndex: number,
  currentPlayerIndex: number,
  playerCount: number,
): SelectedCardView | null => {
  if (!selectedCard) {
    return null;
  }

  const rotatedCurrentPlayerIndex = rotateIndex(currentPlayerIndex, viewerSeatIndex, playerCount) ?? 0;
  const isLocalSelection = rotatedCurrentPlayerIndex === 0;
  const card =
    isLocalSelection || selectedCard.source !== 'hand'
      ? cloneCard(selectedCard.card)
      : { ...HIDDEN_CARD };

  return {
    ...selectedCard,
    card,
    isHidden: !isLocalSelection && selectedCard.source === 'hand',
  };
};

export const serializeClientGameView = ({
  connectedSeats,
  expiresAt,
  gameState,
  hostSeatIndex = 0,
  roomCode,
  seatCapacity = gameState.players.length,
  status,
  version,
  viewerSeatIndex,
}: SerializeClientGameViewInput): ClientGameView => {
  const playerCount = gameState.players.length;
  const sourcePlayers = gameState.players
    .map((player, index) => ({
      player,
      relativeSeatIndex: rotateIndex(index, viewerSeatIndex, playerCount) ?? 0,
    }))
    .sort((left, right) => left.relativeSeatIndex - right.relativeSeatIndex);
  const players: PlayerView[] = sourcePlayers.map(({ player, relativeSeatIndex }) => {
    const role = relativeSeatIndex === 0 ? 'local' : 'opponent';

    return {
      ...player,
      displayName: getPlayerDisplayName(player, role, relativeSeatIndex, player.seatIndex, playerCount),
      hand: redactHand(player.hand, role === 'local'),
      isHandVisible: role === 'local',
      isAI: role === 'opponent',
      kind: 'human',
      relativeSeatIndex,
      role,
      stockPile: role === 'local'
        ? revealStockPile(player.stockPile)
        : redactStockPile(player.stockPile, OPPONENT_VISIBLE_STOCK_CARDS),
    };
  });

  return {
    buildPiles: gameState.buildPiles.map((pile) => pile.map(cloneCard)),
    completedBuildPiles: gameState.completedBuildPiles.map(cloneCard),
    config: gameState.config,
    currentPlayerIndex: rotateIndex(gameState.currentPlayerIndex, viewerSeatIndex, playerCount) ?? 0,
    deck: redactDeck(gameState.deck),
    gameIsOver: gameState.gameIsOver,
    message: getViewMessage(gameState, viewerSeatIndex, status, connectedSeats, players),
    players,
    room: {
      connectedSeats,
      expiresAt,
      hostSeatIndex,
      roomCode,
      seatCapacity,
      status,
      version,
    },
    selectedCard: toSelectedCardView(gameState.selectedCard, viewerSeatIndex, gameState.currentPlayerIndex, playerCount),
    winnerIndex: rotateIndex(gameState.winnerIndex, viewerSeatIndex, playerCount),
  };
};
