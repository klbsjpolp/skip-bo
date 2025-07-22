import CONFIG from './config.js';
import SkipBoGame from './game.js';

export class GameFactory {
    static createGame(gameMode = 'CLASSIC', options = {}) {
        const modeConfig = CONFIG.GAME_MODES[gameMode] || CONFIG.GAME_MODES.CLASSIC;

        const game = new SkipBoGame();

        // Apply game mode settings
        game.config = {
            ...CONFIG.GAME,
            STOCK_PILE_SIZE: modeConfig.stockPileSize,
            ...options
        };

        // Configure AI difficulty
        const aiConfig = CONFIG.AI_DIFFICULTIES[modeConfig.aiDifficulty.toUpperCase()];
        if (aiConfig) {
            game.aiStrategy.setDifficulty(modeConfig.aiDifficulty);
            game.aiStrategy.configure(aiConfig);
        }

        // Set up players based on mode
        this.setupPlayers(game, modeConfig, options);

        return game;
    }

    static setupPlayers(game, modeConfig, options) {
        const playerCount = options.playerCount || 2;
        const aiCount = options.aiCount || 1;

        game.players = [];

        // Add human players
        for (let i = 0; i < playerCount - aiCount; i++) {
            game.players.push(new Player(false));
        }

        // Add AI players
        for (let i = 0; i < aiCount; i++) {
            game.players.push(new Player(true));
        }
    }

    static createTournament(players, gameMode = 'CLASSIC') {
        return {
            players,
            games: [],
            currentRound: 0,
            scores: new Map(),
            gameMode
        };
    }
}
