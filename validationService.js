import CONFIG from './config.js';

export class ValidationService {
    static isValidCard(card) {
        return card === 'SB' || (Number.isInteger(card) && card >= 1 && card <= 12);
    }

    static isValidBuildPilePlay(card, pile) {
        if (!this.isValidCard(card)) {
            return false;
        }

        // Skip-Bo cards can always be played
        if (card === 'SB') {
            return true;
        }

        // Empty pile - only 1 can be played
        if (pile.length === 0) {
            return card === 1;
        }

        // Get the effective value of the top card
        const topCard = pile[pile.length - 1];
        const expectedNext = this.getExpectedNextValue(pile);

        return card === expectedNext;
    }

    static getExpectedNextValue(pile) {
        if (pile.length === 0) {
            return 1;
        }

        const topCard = pile[pile.length - 1];

        if (topCard === 'SB') {
            // Find the effective value of the Skip-Bo card
            const effectiveValue = this.getSkipBoEffectiveValue(pile);
            return effectiveValue < 12 ? effectiveValue + 1 : null;
        }

        return topCard < 12 ? topCard + 1 : null;
    }

    static getSkipBoEffectiveValue(pile) {
        // Find the last non-Skip-Bo card to determine what value the Skip-Bo represents
        for (let i = pile.length - 1; i >= 0; i--) {
            if (pile[i] !== 'SB') {
                return pile[i];
            }
        }
        // If all cards are Skip-Bo from the beginning, they represent consecutive values starting from 1
        return pile.length;
    }

    static canDiscardToDiscardPile(card, discardPile) {
        // Any card can be discarded to any discard pile
        return this.isValidCard(card);
    }

    static isGameWinnable(player) {
        // Check if player has any playable cards
        return player.stock.length === 0;
    }

    static validateGameState(game) {
        const errors = [];

        // Validate players
        if (!game.players || game.players.length !== 2) {
            errors.push('Game must have exactly 2 players');
        }

        // Validate deck
        if (!game.deck) {
            errors.push('Game must have a deck');
        }

        // Validate build piles
        if (!game.buildPiles || !game.buildPiles.piles) {
            errors.push('Game must have build piles');
        } else if (game.buildPiles.piles.length !== 4) {
            errors.push('Game must have exactly 4 build piles');
        }

        // Validate build pile sequences
        game.buildPiles.piles.forEach((pile, index) => {
            const validationError = this.validateBuildPileSequence(pile);
            if (validationError) {
                errors.push(`Build pile ${index + 1}: ${validationError}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static validateBuildPileSequence(pile) {
        if (pile.length === 0) {
            return null; // Empty pile is valid
        }

        // First card must be 1 or Skip-Bo
        if (pile[0] !== 'SB' && pile[0] !== 1) {
            return 'First card must be 1 or Skip-Bo';
        }

        // Check sequence
        let expectedValue = 1;
        for (let i = 0; i < pile.length; i++) {
            const card = pile[i];

            if (card === 'SB') {
                // Skip-Bo represents the expected value
                expectedValue++;
            } else if (card === expectedValue) {
                expectedValue++;
            } else {
                return `Card at position ${i + 1} should be ${expectedValue} but found ${card}`;
            }

            // Check if we've exceeded the maximum pile value
            if (expectedValue > 13) { // 13 because we increment after placing 12
                return 'Pile sequence exceeds maximum value of 12';
            }
        }

        return null; // Sequence is valid
    }

    static getPlayableCards(player, buildPiles) {
        const playableCards = [];

        // Check stock pile top card
        if (player.stock.length > 0) {
            const stockCard = player.stock[player.stock.length - 1];
            const stockPlayable = buildPiles.piles.some((pile, index) =>
                buildPiles.canPlayCard(stockCard, index)
            );
            if (stockPlayable) {
                playableCards.push({
                    card: stockCard,
                    source: 'stock',
                    index: player.stock.length - 1
                });
            }
        }

        // Check hand cards
        player.hand.forEach((card, index) => {
            const handPlayable = buildPiles.piles.some((pile, pileIndex) =>
                buildPiles.canPlayCard(card, pileIndex)
            );
            if (handPlayable) {
                playableCards.push({
                    card: card,
                    source: 'hand',
                    index: index
                });
            }
        });

        // Check discard pile top cards
        player.discard.forEach((discardPile, pileIndex) => {
            if (discardPile.length > 0) {
                const topCard = discardPile[discardPile.length - 1];
                const discardPlayable = buildPiles.piles.some((pile, buildPileIndex) =>
                    buildPiles.canPlayCard(topCard, buildPileIndex)
                );
                if (discardPlayable) {
                    playableCards.push({
                        card: topCard,
                        source: 'discard',
                        index: pileIndex
                    });
                }
            }
        });

        return playableCards;
    }
}
