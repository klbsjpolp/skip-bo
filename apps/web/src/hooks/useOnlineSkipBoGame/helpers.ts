import {
  type Card,
  type GameAction,
  type GameMessage,
  gameReducer,
  type GameState,
  initialGameState,
} from '@skipbo/game-core';
import { type ClientGameView, serializeClientGameView } from '@skipbo/skipbo-runtime';

import type { AnimationDriver } from '@/services/animationDriver';

export interface DrawTransition {
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

export interface TurnPresentationOverride {
  currentPlayerIndex: number;
  message: GameMessage;
}

export const cloneGameStateFromView = (view: ClientGameView): GameState => ({
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

export const createPlaceholderGameState = (roomCode: string, seatCapacity: number): GameState => {
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
  state.message = { code: 'CONNECTING', roomCode };

  return state;
};

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

export const applyOptimisticPlayView = (
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

export const applyOptimisticDiscardView = (currentView: ClientGameView, discardPile: number): ClientGameView =>
  serializeLocalView(
    gameReducer(cloneGameStateFromView(currentView), {
      type: 'DISCARD_CARD',
      discardPile,
    }),
    currentView,
  );

export const collectDrawTransitions = (previousState: GameState, nextState: GameState): DrawTransition[] => {
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

export const scheduleDrawAnimations = (
  driver: Pick<AnimationDriver, 'animateDraws'>,
  drawTransitions: DrawTransition[],
  baseDelay: number = 0,
): void => {
  drawTransitions.forEach((drawTransition) => {
    void driver
      .animateDraws(drawTransition.playerIndex, drawTransition.cards, drawTransition.handIndices, 500, baseDelay)
      .catch((error) => {
        console.warn('Draw animation failed during online transition:', error);
      });
  });
};

export const getMaxDrawAnimationDuration = (
  driver: Pick<AnimationDriver, 'calculateDrawsDuration'>,
  drawTransitions: DrawTransition[],
  baseDelay: number = 0,
): number =>
  drawTransitions.reduce(
    (maxDuration, drawTransition) =>
      Math.max(
        maxDuration,
        driver.calculateDrawsDuration(drawTransition.playerIndex, drawTransition.handIndices, 500, baseDelay),
      ),
    0,
  );
