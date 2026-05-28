import type { Card, GameState, Player } from '../types/index.js';

export const getPlayer = (state: GameState, playerIndex: number): Player => state.players[playerIndex];

export const getActivePlayer = (state: GameState): Player => state.players[state.currentPlayerIndex];

export const getPlayerHand = (state: GameState, playerIndex: number): readonly (Card | null)[] =>
  state.players[playerIndex].hand;

export const getStockPile = (state: GameState, playerIndex: number): readonly Card[] =>
  state.players[playerIndex].stockPile;

export const getTopStockCard = (state: GameState, playerIndex: number): Card | null => {
  const pile = state.players[playerIndex].stockPile;
  return pile.length > 0 ? pile[pile.length - 1] : null;
};

export const getDiscardPile = (state: GameState, playerIndex: number, discardPileIndex: number): readonly Card[] =>
  state.players[playerIndex].discardPiles[discardPileIndex];

export const getTopDiscardCard = (state: GameState, playerIndex: number, discardPileIndex: number): Card | null => {
  const pile = state.players[playerIndex].discardPiles[discardPileIndex];
  return pile.length > 0 ? pile[pile.length - 1] : null;
};

export const getBuildPile = (state: GameState, buildPileIndex: number): readonly Card[] =>
  state.buildPiles[buildPileIndex];

export const getBuildPileTop = (state: GameState, buildPileIndex: number): Card | null => {
  const pile = state.buildPiles[buildPileIndex];
  return pile.length > 0 ? pile[pile.length - 1] : null;
};

export const getNextBuildPileValue = (state: GameState, buildPileIndex: number): number =>
  state.buildPiles[buildPileIndex].length + 1;

export const isPlayerTurn = (state: GameState, playerIndex: number): boolean =>
  state.currentPlayerIndex === playerIndex;

export const getStockSize = (state: GameState, playerIndex: number): number =>
  state.players[playerIndex].stockPile.length;

export const isHandEmpty = (state: GameState, playerIndex: number): boolean =>
  state.players[playerIndex].hand.every((card) => card === null);

export const countEmptyHandSlots = (state: GameState, playerIndex: number): number =>
  state.players[playerIndex].hand.filter((card) => card === null).length;
