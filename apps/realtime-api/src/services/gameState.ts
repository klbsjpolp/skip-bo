import { canPlayCard, gameReducer, initialGameState, type Card, type GameAction, type GameState, type Player, type SelectedCard } from '@skipbo/game-core';

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

const isSupportedOnlineAction = (action: GameAction): boolean =>
  action.type !== 'INIT' &&
  action.type !== 'DRAW' &&
  action.type !== 'DRAW_SINGLE_CARD' &&
  action.type !== 'RESET' &&
  action.type !== 'DEBUG_SET_AI_HAND' &&
  action.type !== 'DEBUG_FILL_BUILD_PILE';

export const createOnlineInitialGameState = (stockSize?: number): GameState => {
  const state = initialGameState({ stockSize });

  state.players = state.players.map((player, seatIndex) => ({
    ...player,
    isAI: false,
    kind: 'human',
    seatIndex,
  }));
  state.message = 'En attente d’un autre joueur';

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
    case 'DEBUG_SET_AI_HAND':
    case 'DEBUG_FILL_BUILD_PILE':
      return 'Cette action n’est pas autorisée en multijoueur';
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
