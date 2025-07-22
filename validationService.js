import CONFIG from './config.js';

export class ValidationService {
    static validateCardPlay(card, pile, gameRules = {}) {
        const rules = { ...CONFIG.GAME, ...gameRules };

        if (!card || (!Number.isInteger(card) && card !== 'SB')) {
            return { valid: false, reason: 'Invalid card value' };
        }

        if (!Array.isArray(pile)) {
            return { valid: false, reason: 'Invalid pile' };
        }

        const topValue = pile.length > 0 ? pile[pile.length - 1] : 0;
        const expectedValue = topValue + 1;

        if (card === 'SB') {
            return { valid: true, playedAs: expectedValue };
        }

        if (card === expectedValue) {
            return { valid: true, playedAs: card };
        }

        return {
            valid: false,
            reason: `Expected ${expectedValue}, got ${card}`
        };
    }

    static validatePlayerMove(player, source, sourceIndex) {
        if (!player) {
            return { valid: false, reason: 'No player specified' };
        }

        switch (source) {
            case 'stock':
                if (player.stock.length === 0) {
                    return { valid: false, reason: 'Stock pile is empty' };
                }
                return { valid: true };

            case 'hand':
                if (sourceIndex < 0 || sourceIndex >= player.hand.length) {
                    return { valid: false, reason: 'Invalid hand index' };
                }
                return { valid: true };

            case 'discard':
                if (sourceIndex < 0 || sourceIndex >= player.discard.length) {
                    return { valid: false, reason: 'Invalid discard pile index' };
                }
                if (player.discard[sourceIndex].length === 0) {
                    return { valid: false, reason: 'Discard pile is empty' };
                }
                return { valid: true };

            default:
                return { valid: false, reason: 'Invalid source' };
        }
    }

    static validateGameState(gameState) {
        const errors = [];

        if (!gameState.players || gameState.players.length < 2) {
            errors.push('Game must have at least 2 players');
        }

        if (!gameState.buildPiles || gameState.buildPiles.length !== CONFIG.GAME.BUILD_PILES_COUNT) {
            errors.push(`Game must have exactly ${CONFIG.GAME.BUILD_PILES_COUNT} build piles`);
        }

        gameState.players.forEach((player, index) => {
            if (!player.discard || player.discard.length !== CONFIG.GAME.DISCARD_PILES_COUNT) {
                errors.push(`Player ${index} must have exactly ${CONFIG.GAME.DISCARD_PILES_COUNT} discard piles`);
            }

            if (player.hand.length > CONFIG.GAME.HAND_SIZE) {
                errors.push(`Player ${index} has too many cards in hand`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validateDiscardMove(player, cardIndex, discardPileIndex) {
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return { valid: false, reason: 'Invalid card index' };
        }

        if (discardPileIndex < 0 || discardPileIndex >= CONFIG.GAME.DISCARD_PILES_COUNT) {
            return { valid: false, reason: 'Invalid discard pile index' };
        }

        return { valid: true };
    }
}
