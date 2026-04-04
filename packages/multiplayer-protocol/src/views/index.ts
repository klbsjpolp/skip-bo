import type { Card, GameConfig, GameState, Player, SelectedCard } from '@skipbo/game-core';

export type RoomStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';

export interface PlayerView extends Player {
  displayName: string;
  isHandVisible: boolean;
  role: 'local' | 'opponent';
}

export interface SelectedCardView extends SelectedCard {
  isHidden?: boolean;
}

export interface RoomSummary {
  connectedSeats: number[];
  expiresAt: string;
  roomCode: string;
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
  roomCode: string;
  status: RoomStatus;
  version: number;
  viewerSeatIndex: number;
}

export const HIDDEN_CARD: Card = {
  value: 0,
  isSkipBo: false,
};

const cloneCard = (card: Card): Card => ({ ...card });

const redactDeck = (deck: Card[]): Card[] => deck.map(() => ({ ...HIDDEN_CARD }));

const redactStockPile = (stockPile: Card[]): Card[] => {
  if (stockPile.length === 0) {
    return [];
  }

  return stockPile.map((card, index) =>
    index === stockPile.length - 1 ? cloneCard(card) : { ...HIDDEN_CARD },
  );
};

const redactHand = (hand: (Card | null)[], isVisible: boolean): (Card | null)[] =>
  hand.map((card) => {
    if (!card) {
      return null;
    }

    return isVisible ? cloneCard(card) : { ...HIDDEN_CARD };
  });

const rotateIndex = (index: number | null, viewerSeatIndex: number): number | null => {
  if (index === null) {
    return null;
  }

  return viewerSeatIndex === 0 ? index : 1 - index;
};

const getPlayerDisplayName = (role: 'local' | 'opponent'): string =>
  role === 'local' ? 'Vous' : 'Adversaire';

const getViewMessage = (
  gameState: GameState,
  viewerSeatIndex: number,
  status: RoomStatus,
  connectedSeats: number[],
): string => {
  const rotatedWinnerIndex = rotateIndex(gameState.winnerIndex, viewerSeatIndex);
  const rotatedCurrentPlayerIndex = rotateIndex(gameState.currentPlayerIndex, viewerSeatIndex) ?? 0;

  if (status === 'WAITING' || connectedSeats.length < 2) {
    return 'En attente d’un autre joueur';
  }

  if (gameState.gameIsOver) {
    return rotatedWinnerIndex === 0 ? 'Vous avez gagné !' : 'Votre adversaire a gagné.';
  }

  if (rotatedCurrentPlayerIndex === 0) {
    return gameState.selectedCard ? 'Sélectionnez une destination' : "C'est votre tour";
  }

  return "Tour de l'adversaire";
};

const toSelectedCardView = (
  selectedCard: SelectedCard | null,
  viewerSeatIndex: number,
  currentPlayerIndex: number,
): SelectedCardView | null => {
  if (!selectedCard) {
    return null;
  }

  const rotatedCurrentPlayerIndex = rotateIndex(currentPlayerIndex, viewerSeatIndex) ?? 0;
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
  roomCode,
  status,
  version,
  viewerSeatIndex,
}: SerializeClientGameViewInput): ClientGameView => {
  const sourcePlayers =
    viewerSeatIndex === 0
      ? gameState.players
      : [gameState.players[1], gameState.players[0]];
  const players: PlayerView[] = sourcePlayers.map((player, index) => {
    const role = index === 0 ? 'local' : 'opponent';

    return {
      ...player,
      displayName: getPlayerDisplayName(role),
      hand: redactHand(player.hand, role === 'local'),
      isHandVisible: role === 'local',
      isAI: role === 'opponent',
      kind: 'human',
      role,
      stockPile: redactStockPile(player.stockPile),
    };
  });

  return {
    buildPiles: gameState.buildPiles.map((pile) => pile.map(cloneCard)),
    completedBuildPiles: gameState.completedBuildPiles.map(cloneCard),
    config: gameState.config,
    currentPlayerIndex: rotateIndex(gameState.currentPlayerIndex, viewerSeatIndex) ?? 0,
    deck: redactDeck(gameState.deck),
    gameIsOver: gameState.gameIsOver,
    message: getViewMessage(gameState, viewerSeatIndex, status, connectedSeats),
    players,
    room: {
      connectedSeats,
      expiresAt,
      roomCode,
      status,
      version,
    },
    selectedCard: toSelectedCardView(gameState.selectedCard, viewerSeatIndex, gameState.currentPlayerIndex),
    winnerIndex: rotateIndex(gameState.winnerIndex, viewerSeatIndex),
  };
};
