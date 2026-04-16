import { canPlayCard, gameReducer, initialGameState, type Card, type GameAction, type GameState, type Player, type SelectedCard } from '@skipbo/game-core';
import { resolvePlayerName } from '@skipbo/multiplayer-protocol';

const cardsMatch = (candidate: Card | null | undefined, selectedCard: Card): boolean =>
  !!candidate &&
  candidate.value === selectedCard.value &&
  candidate.isSkipBo === selectedCard.isSkipBo;

const hasValidDiscardPileIndex = (player: Player, discardPileIndex: number): boolean =>
  discardPileIndex >= 0 && discardPileIndex < player.discardPiles.length;

const hasValidSelectedSource = (player: Player, selectedCard: SelectedCard): boolean => {
  switch (selectedCard.source) {
    case 'hand':
      return (
        selectedCard.index >= 0 &&
        selectedCard.index < player.hand.length &&
        cardsMatch(player.hand[selectedCard.index], selectedCard.card)
      );
    case 'stock':
      return cardsMatch(player.stockPile[player.stockPile.length - 1], selectedCard.card);
    case 'discard':
      return (
        selectedCard.discardPileIndex !== undefined &&
        hasValidDiscardPileIndex(player, selectedCard.discardPileIndex) &&
        cardsMatch(
          player.discardPiles[selectedCard.discardPileIndex][
            player.discardPiles[selectedCard.discardPileIndex].length - 1
          ],
          selectedCard.card,
        )
      );
  }
};

const isCardSelectable = (gameState: GameState, action: Extract<GameAction, { type: 'SELECT_CARD' }>): boolean => {
  const player = gameState.players[gameState.currentPlayerIndex];

  if (action.source === 'hand') {
    return action.index >= 0 && action.index < player.hand.length && player.hand[action.index] !== null;
  }

  if (action.source === 'stock') {
    return player.stockPile.length > 0 && action.index === player.stockPile.length - 1;
  }

  if (action.source === 'discard') {
    return (
      action.discardPileIndex !== undefined &&
      hasValidDiscardPileIndex(player, action.discardPileIndex) &&
      player.discardPiles[action.discardPileIndex].length > 0 &&
      action.index === player.discardPiles[action.discardPileIndex].length - 1
    );
  }

  return false;
};

export const isDebugAction = (action: GameAction): boolean =>
  action.type === 'DEBUG_SET_AI_HAND' ||
  action.type === 'DEBUG_FILL_BUILD_PILE' ||
  action.type === 'DEBUG_WIN';

const isSupportedOnlineAction = (action: GameAction): boolean => {
  if (action.type === 'INIT' || action.type === 'DRAW' || action.type === 'DRAW_SINGLE_CARD' || action.type === 'RESET') {
    return false;
  }

  if (isDebugAction(action)) {
    return process.env['NODE_ENV'] !== 'production';
  }

  return true;
};

interface OnlineInitialGameStateOptions {
  playerCount?: number;
  playerNames?: Array<string | undefined>;
  seatIndices?: number[];
  stockSize?: number;
}

const assignOnlinePlayerMetadata = (
  state: GameState,
  seatIndices?: number[],
  playerNames?: Array<string | undefined>,
): GameState => {
  state.players = state.players.map((player, playerIndex) => ({
    ...player,
    isAI: false,
    kind: 'human',
    name: resolvePlayerName(playerNames?.[playerIndex], seatIndices?.[playerIndex] ?? playerIndex),
    seatIndex: seatIndices?.[playerIndex] ?? playerIndex,
  }));

  return state;
};

export const createWaitingRoomState = (stockSize?: number, seatCapacity: number = 4): GameState => {
  const state = assignOnlinePlayerMetadata(initialGameState({ playerCount: seatCapacity, stockSize }));

  state.deck = [];
  state.buildPiles = state.buildPiles.map(() => []);
  state.completedBuildPiles = [];
  state.players = state.players.map((player) => ({
    ...player,
    discardPiles: player.discardPiles.map(() => []),
    stockPile: [],
  }));
  state.message = 'En attente d’au moins un autre joueur';

  return state;
};

export const createOnlineInitialGameState = ({
  playerCount = 2,
  playerNames,
  seatIndices,
  stockSize,
}: OnlineInitialGameStateOptions = {}): GameState => {
  const state = initialGameState({ playerCount, stockSize });

  assignOnlinePlayerMetadata(state, seatIndices, playerNames);
  state.message = "C'est votre tour";

  return state;
};

export const validateOnlineAction = (gameState: GameState, action: GameAction): string | null => {
  if (!isSupportedOnlineAction(action)) {
    return 'Cette action n’est pas autorisée en multijoueur';
  }

  switch (action.type) {
    case 'SELECT_CARD':
      return isCardSelectable(gameState, action) ? null : 'Carte introuvable';
    case 'CLEAR_SELECTION':
      return null;
    case 'PLAY_CARD': {
      if (!gameState.selectedCard) {
        return 'Aucune carte sélectionnée';
      }

      const player = gameState.players[gameState.currentPlayerIndex];

      if (!hasValidSelectedSource(player, gameState.selectedCard)) {
        return 'La source sélectionnée est invalide';
      }

      return canPlayCard(gameState.selectedCard.card, action.buildPile, gameState)
        ? null
        : 'Vous ne pouvez pas jouer cette carte ici';
    }
    case 'DISCARD_CARD': {
      const selectedCard = gameState.selectedCard;

      if (!selectedCard) {
        return 'Aucune carte sélectionnée';
      }

      const player = gameState.players[gameState.currentPlayerIndex];

      if (selectedCard.source !== 'hand') {
        return 'Vous devez défausser une carte de votre main';
      }

      if (selectedCard.card.isSkipBo) {
        return 'Vous ne pouvez pas défausser une carte Skip-Bo';
      }

      if (!hasValidSelectedSource(player, selectedCard) || !hasValidDiscardPileIndex(player, action.discardPile)) {
        return 'Défausse invalide';
      }

      return null;
    }
    case 'END_TURN':
      return null;
    case 'INIT':
    case 'DRAW':
    case 'DRAW_SINGLE_CARD':
    case 'RESET':
      return 'Cette action n’est pas autorisée en multijoueur';
    case 'DEBUG_SET_AI_HAND':
    case 'DEBUG_FILL_BUILD_PILE':
    case 'DEBUG_WIN':
      return null;
  }
};

export const applyOnlineAction = (gameState: GameState, action: GameAction): GameState => {
  const previousCurrentPlayer = gameState.currentPlayerIndex;
  let nextState = gameReducer(gameState, action);

  if (nextState.currentPlayerIndex !== previousCurrentPlayer) {
    nextState = gameReducer(nextState, { type: 'DRAW' });
  }

  return nextState;
};
