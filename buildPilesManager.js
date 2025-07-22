import CONFIG from './config.js';

export class BuildPilesManager {
    constructor() {
        this.piles = [];
        this.reset();

        // Make this object behave like an array for UI compatibility
        return new Proxy(this, {
            get(target, prop) {
                // If accessing a numeric index, return the pile at that index
                if (typeof prop === 'string' && !isNaN(prop)) {
                    return target.piles[parseInt(prop)];
                }
                // If accessing array methods like forEach, map, etc., delegate to piles array
                if (typeof target.piles[prop] === 'function') {
                    return target.piles[prop].bind(target.piles);
                }
                // For length property, return piles length
                if (prop === 'length') {
                    return target.piles.length;
                }
                // Otherwise return the property from the target object
                return target[prop];
            }
        });
    }

    reset() {
        // Initialize 4 empty build piles
        this.piles = Array(CONFIG.GAME.BUILD_PILES).fill(null).map(() => []);
    }

    canPlayCard(card, pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return false;
        }

        const pile = this.piles[pileIndex];
        const cardValue = this.getCardValue(card);

        // Invalid card cannot be played
        if (cardValue === null) {
            return false;
        }

        // Empty pile can only accept 1 or Skip-Bo
        if (pile.length === 0) {
            return cardValue === 1 || cardValue === 0; // 1 or Skip-Bo
        }

        const topCard = pile[pile.length - 1];
        const topValue = this.getCardValue(topCard);

        // If top card is invalid, pile is corrupted
        if (topValue === null) {
            return false;
        }

        // Skip-Bo cards can be played as any needed value
        if (cardValue === 0) {
            return topValue < CONFIG.GAME.MAX_BUILD_PILE_VALUE;
        }

        // Regular cards must be exactly one higher than the top card
        return cardValue === topValue + 1;
    }

    playCard(card, pileIndex) {
        if (!this.canPlayCard(card, pileIndex)) {
            return { success: false };
        }

        this.piles[pileIndex].push(card);

        // Check if pile is complete (reached 12)
        if (this.piles[pileIndex].length === CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
            return this.completePile(pileIndex);
        }

        return { success: true };
    }

    completePile(pileIndex) {
        const completedCards = this.piles[pileIndex].slice();
        this.piles[pileIndex] = []; // Reset the pile

        return {
            success: true,
            completed: true,
            completedCards: completedCards,
            pileIndex: pileIndex
        };
    }

    getCardValue(card) {
        // Handle different card representations
        if (typeof card === 'string') {
            if (card === 'SB' || card === 'Skip-Bo') {
                return 0; // Skip-Bo wildcard
            }
            const parsed = parseInt(card);
            if (isNaN(parsed)) {
                return null; // Invalid card
            }
            return parsed;
        }

        if (typeof card === 'object' && card !== null) {
            if (card.value === 'SB' || card.value === 'Skip-Bo' || card.isSkipBo) {
                return 0; // Skip-Bo wildcard
            }
            const parsed = parseInt(card.value || card.number || card);
            if (isNaN(parsed)) {
                return null; // Invalid card
            }
            return parsed;
        }

        if (typeof card === 'number') {
            if (card === 0) return 0; // Skip-Bo wildcard
            if (card >= 1 && card <= 12) return card; // Valid number card
            return null; // Invalid number
        }

        // Fallback - try to parse, but don't default to 0
        const parsed = parseInt(card);
        if (isNaN(parsed)) {
            return null; // Invalid card
        }
        return parsed;
    }

    getTopCard(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length || this.piles[pileIndex].length === 0) {
            return null;
        }
        return this.piles[pileIndex][this.piles[pileIndex].length - 1];
    }

    getExpectedNextValue(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return null;
        }

        const pile = this.piles[pileIndex];
        if (pile.length === 0) {
            return 1; // Empty pile expects 1
        }

        const topValue = this.getCardValue(this.getTopCard(pileIndex));
        return topValue >= CONFIG.GAME.MAX_BUILD_PILE_VALUE ? null : topValue + 1;
    }

    getPileSize(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return 0;
        }
        return this.piles[pileIndex].length;
    }

    isEmpty(pileIndex) {
        return this.getPileSize(pileIndex) === 0;
    }

    isFull(pileIndex) {
        return this.getPileSize(pileIndex) >= CONFIG.GAME.MAX_BUILD_PILE_VALUE;
    }

    getAllPossiblePlays(card) {
        const possiblePiles = [];
        for (let i = 0; i < this.piles.length; i++) {
            if (this.canPlayCard(card, i)) {
                possiblePiles.push({
                    pileIndex: i,
                    expectedValue: this.getExpectedNextValue(i),
                    currentSize: this.getPileSize(i)
                });
            }
        }
        return possiblePiles;
    }

    // Method to make buildPiles iterable for UI compatibility
    [Symbol.iterator]() {
        return this.piles[Symbol.iterator]();
    }

    // Getter for compatibility with existing code
    get length() {
        return this.piles.length;
    }

    // Method to access piles by index
    getPile(index) {
        return this.piles[index] || [];
    }
}
