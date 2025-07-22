import CONFIG from './config.js';

export class BuildPilesManager {
    constructor() {
        this.piles = [];
        this.reset();
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

        // Empty pile can only accept 1 or Skip-Bo
        if (pile.length === 0) {
            return cardValue === 1 || cardValue === 0; // 1 or Skip-Bo
        }

        const topCard = pile[pile.length - 1];
        const topValue = this.getCardValue(topCard);

        // Skip-Bo cards can be played as any needed value
        if (cardValue === 0) {
            return topValue < CONFIG.GAME.MAX_BUILD_PILE_VALUE;
        }

        // Regular cards must be exactly one higher than the top card
        return cardValue === topValue + 1;
    }

    playCard(card, pileIndex) {
        if (!this.canPlayCard(card, pileIndex)) {
            return false;
        }

        this.piles[pileIndex].push(card);

        // Check if pile is complete (reached 12)
        if (this.piles[pileIndex].length === CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
            return this.completePile(pileIndex);
        }

        return true;
    }

    completePile(pileIndex) {
        if (pileIndex >= 0 && pileIndex < this.piles.length) {
            const completedPile = this.piles[pileIndex];
            this.piles[pileIndex] = []; // Reset pile to empty
            return completedPile;
        }
        return null;
    }

    getCardValue(card) {
        if (!card) return -1;

        // Handle different card formats
        if (typeof card === 'object') {
            if (card.isSkipBo || card.value === 0) return 0;
            return card.value || card.number || -1;
        }

        // Handle string/primitive formats
        if (card === 'SB' || card === 'SKIP_BO') return 0;
        return parseInt(card) || -1;
    }

    getPileTop(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return null;
        }

        const pile = this.piles[pileIndex];
        return pile.length > 0 ? pile[pile.length - 1] : null;
    }

    getPileSize(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return 0;
        }
        return this.piles[pileIndex].length;
    }

    getAllPiles() {
        return this.piles;
    }

    getNextRequiredValue(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return -1;
        }

        const pile = this.piles[pileIndex];
        if (pile.length === 0) {
            return 1; // Empty pile needs a 1
        }

        const topValue = this.getCardValue(pile[pile.length - 1]);
        if (topValue >= CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
            return -1; // Pile is complete
        }

        return topValue + 1;
    }

    getAvailablePiles() {
        const available = [];
        for (let i = 0; i < this.piles.length; i++) {
            if (this.piles[i].length < CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
                available.push(i);
            }
        }
        return available;
    }

    isEmpty() {
        return this.piles.every(pile => pile.length === 0);
    }

    // Method to make buildPiles iterable for UI compatibility
    forEach(callback) {
        this.piles.forEach(callback);
    }

    // Allow array-like access
    get length() {
        return this.piles.length;
    }

    // Array-like indexing
    [Symbol.iterator]() {
        return this.piles[Symbol.iterator]();
    }
}
