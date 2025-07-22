import { GameConfig } from '@/types';

export const CONFIG: GameConfig = {
  DECK_SIZE: 162,
  SKIP_BO_CARDS: 18,
  HAND_SIZE: 5,
  STOCK_SIZE: 30,
  BUILD_PILES_COUNT: 4,
  DISCARD_PILES_COUNT: 4,
};

export const CARD_VALUES = {
  MIN: 1,
  MAX: 12,
  SKIP_BO: 0,
};

export const MESSAGES = {
  GAME_START: "Nouvelle partie commencée !",
  INVALID_MOVE: "Mouvement invalide",
  CARD_PLAYED: "Carte jouée",
  TURN_ENDED: "Tour terminé",
  GAME_WON: "Partie gagnée !",
  AI_THINKING: "L'IA réfléchit...",
  SELECT_CARD: "Sélectionnez une carte",
  SELECT_DESTINATION: "Sélectionnez une destination",
};
