import type { GameMessage } from '@skipbo/game-core';

/**
 * The one place game-status text is rendered. The rules layer (game-core
 * reducer) and the online view layer (skipbo-runtime) only emit semantic
 * `GameMessage` codes; every French string lives here so i18n never has to
 * touch the rules packages.
 */
export const renderGameMessage = (message: GameMessage): string => {
  switch (message.code) {
    case 'GAME_START':
      return 'Nouvelle partie commencée !';
    case 'INVALID_MOVE':
      return 'Mouvement invalide';
    case 'INVALID_MOVE_NO_SELECTION':
      return 'Mouvement invalide: Aucune carte sélectionnée';
    case 'INVALID_MOVE_CANNOT_PLAY':
      return 'Mouvement invalide: Vous ne pouvez pas jouer cette carte';
    case 'INVALID_MOVE_MUST_DISCARD_FROM_HAND':
      return 'Mouvement invalide: Vous devez défausser une carte de votre main';
    case 'INVALID_CARD_VALUE':
      return 'Error: Invalid card value';
    case 'SELECT_CARD':
      return 'Sélectionnez une carte';
    case 'SELECT_DESTINATION':
      return 'Sélectionnez une destination';
    case 'AI_PLAYING':
      return "L'IA joue";
    case 'CARD_PLAYED':
      return 'Vous avez joué une carte';
    case 'TURN_ENDED': {
      const previous = message.previousPlayerIsAI ? "Tour de l'IA terminé" : 'Votre tour est terminé';
      const next = message.nextPlayerIsAI ? "L'IA joue" : "C'est votre tour";
      return `${previous}. ${next}`;
    }
    case 'GAME_WON':
      return `La partie est gagnée par ${message.winnerIsAI ? "l'IA" : 'le joueur'} !`;
    case 'DEBUG_AI_HAND_SET':
      return 'Main IA forcée (debug)';
    case 'DEBUG_BUILD_PILE_READY':
      return 'Pile de construction prête (debug)';
    case 'DEBUG_HAND_SKIPBO_FILLED':
      return 'Main remplie de Skip-Bo (debug)';
    case 'DEBUG_STOCK_PILE_CLEARED':
      return 'Pile de réserve vidée (debug)';
    case 'DEBUG_AI_STOCK_PILE_CLEARED':
      return 'Pile de réserve IA vidée (debug)';
    case 'WAITING_FOR_PLAYERS':
      return 'En attente d’au moins un autre joueur';
    case 'WAITING_FOR_START':
      return 'En attente du démarrage';
    case 'YOU_WON':
      return 'Vous avez gagné !';
    case 'OPPONENT_WON':
      return message.winnerName ? `${message.winnerName} a gagné.` : 'Un adversaire a gagné.';
    case 'YOUR_TURN':
      return "C'est votre tour";
    case 'OPPONENT_TURN':
      return message.playerName
        ? `Tour de ${message.playerName} (${message.stockPileLength ?? 0})`
        : 'Tour d’un adversaire';
    case 'CONNECTING':
      return `Connexion à la partie ${message.roomCode ?? ''}`.trimEnd();
  }
};
