// Game configuration constants
const CONFIG = {
    GAME: {
        HAND_SIZE: 5,
        STOCK_PILE_SIZE: 30,
        DISCARD_PILES: 4,
        DISCARD_PILES_COUNT: 4, // Adding this for UI compatibility
        BUILD_PILES: 4,
        DECK_SIZE: 162,
        CARDS_PER_NUMBER: 12,
        SKIP_BO_CARDS: 18,
        MAX_BUILD_PILE_VALUE: 12
    },
    GAME_MODES: {
        CLASSIC: {
            name: 'Classic',
            stockPileSize: 30,
            maxPlayers: 6,
            aiDifficulty: 'medium'
        },
        QUICK: {
            name: 'Quick Game',
            stockPileSize: 15,
            maxPlayers: 4,
            aiDifficulty: 'easy'
        },
        CHALLENGE: {
            name: 'Challenge',
            stockPileSize: 40,
            maxPlayers: 2,
            aiDifficulty: 'hard'
        }
    },
    AI_DIFFICULTIES: {
        EASY: {
            name: 'Easy',
            thinkTime: 1500,
            mistakeChance: 0.15,
            lookahead: 1
        },
        MEDIUM: {
            name: 'Medium',
            thinkTime: 1000,
            mistakeChance: 0.08,
            lookahead: 2
        },
        HARD: {
            name: 'Hard',
            thinkTime: 800,
            mistakeChance: 0.03,
            lookahead: 3
        }
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
    },
    CARD_TYPES: {
        SKIP_BO: 0,
        NUMBERED: 'numbered'
    }
};

export default CONFIG;
