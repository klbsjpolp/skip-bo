// Game configuration constants
const CONFIG = {
    GAME: {
        STOCK_PILE_SIZE: 30,
        HAND_SIZE: 5,
        BUILD_PILES_COUNT: 4,
        DISCARD_PILES_COUNT: 4,
        MAX_BUILD_PILE_VALUE: 12,
        SKIPBO_CARDS_COUNT: 18
    },
    UI: {
        AI_TURN_DELAY: 1000,
        AI_PLAY_DELAY: 500,
        MESSAGE_DISPLAY_DURATION: 1500,
        HAND_REFILL_DELAY: 1000,
        CARD_STACK_OFFSET: 20
    },
    THEMES: {
        DEFAULT: 'light',
        STORAGE_KEY: 'skipbo_theme'
    },
    MESSAGES: {
        AI_TURN: "Tour de l'IA",
        PLAYER_TURN: "Votre tour",
        DECK_EMPTY_RESHUFFLE: "Pioche vide ! Rebrassage de {count} cartes...",
        DECK_EMPTY_NO_CARDS: "Pioche vide ! Aucune carte à piger.",
        HAND_EMPTY_REFILL: "Main vide ! Pige de nouvelles cartes...",
        AI_WINS: "Le Joueur IA gagnez !",
        PLAYER_WINS: "Vous gagnez !"
    }
};

export default CONFIG;
