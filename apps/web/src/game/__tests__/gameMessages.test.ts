import { describe, expect, it } from 'vitest';

import type { GameMessage } from '@skipbo/game-core';

import { renderGameMessage } from '@/game/gameMessages';

const cases: Array<[GameMessage, string]> = [
  [{ code: 'GAME_START' }, 'Nouvelle partie commencée !'],
  [{ code: 'INVALID_MOVE' }, 'Mouvement invalide'],
  [{ code: 'INVALID_MOVE_NO_SELECTION' }, 'Mouvement invalide: Aucune carte sélectionnée'],
  [{ code: 'INVALID_MOVE_CANNOT_PLAY' }, 'Mouvement invalide: Vous ne pouvez pas jouer cette carte'],
  [{ code: 'INVALID_MOVE_MUST_DISCARD_FROM_HAND' }, 'Mouvement invalide: Vous devez défausser une carte de votre main'],
  [{ code: 'INVALID_CARD_VALUE' }, 'Error: Invalid card value'],
  [{ code: 'SELECT_CARD' }, 'Sélectionnez une carte'],
  [{ code: 'SELECT_DESTINATION' }, 'Sélectionnez une destination'],
  [{ code: 'AI_PLAYING' }, "L'IA joue"],
  [{ code: 'CARD_PLAYED' }, 'Vous avez joué une carte'],
  [{ code: 'TURN_ENDED', previousPlayerIsAI: true, nextPlayerIsAI: false }, "Tour de l'IA terminé. C'est votre tour"],
  [{ code: 'TURN_ENDED', previousPlayerIsAI: false, nextPlayerIsAI: true }, "Votre tour est terminé. L'IA joue"],
  [{ code: 'GAME_WON', winnerIsAI: true }, "La partie est gagnée par l'IA !"],
  [{ code: 'GAME_WON', winnerIsAI: false }, 'La partie est gagnée par le joueur !'],
  [{ code: 'DEBUG_AI_HAND_SET' }, 'Main IA forcée (debug)'],
  [{ code: 'DEBUG_BUILD_PILE_READY' }, 'Pile de construction prête (debug)'],
  [{ code: 'DEBUG_HAND_SKIPBO_FILLED' }, 'Main remplie de Skip-Bo (debug)'],
  [{ code: 'DEBUG_STOCK_PILE_CLEARED' }, 'Pile de réserve vidée (debug)'],
  [{ code: 'DEBUG_AI_STOCK_PILE_CLEARED' }, 'Pile de réserve IA vidée (debug)'],
  [{ code: 'WAITING_FOR_PLAYERS' }, 'En attente d’au moins un autre joueur'],
  [{ code: 'WAITING_FOR_START' }, 'En attente du démarrage'],
  [{ code: 'YOU_WON' }, 'Vous avez gagné !'],
  [{ code: 'OPPONENT_WON', winnerName: 'Camille' }, 'Camille a gagné.'],
  [{ code: 'OPPONENT_WON' }, 'Un adversaire a gagné.'],
  [{ code: 'YOUR_TURN' }, "C'est votre tour"],
  [{ code: 'OPPONENT_TURN', playerName: 'Camille', stockPileLength: 12 }, 'Tour de Camille (12)'],
  [{ code: 'OPPONENT_TURN', playerName: 'Camille' }, 'Tour de Camille (0)'],
  [{ code: 'OPPONENT_TURN' }, 'Tour d’un adversaire'],
  [{ code: 'CONNECTING', roomCode: 'ABCD' }, 'Connexion à la partie ABCD'],
  [{ code: 'CONNECTING' }, 'Connexion à la partie'],
];

describe('renderGameMessage', () => {
  it.each(cases)('renders %j', (message, expected) => {
    expect(renderGameMessage(message)).toBe(expected);
  });
});
