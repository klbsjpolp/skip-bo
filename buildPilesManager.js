import CONFIG from './config.js';

export class BuildPilesManager {
    constructor() {
        this.piles = [[], [], [], []]; // 4 build piles
    }

    reset() {
        this.piles = [[], [], [], []];
    }

    canPlayCard(cardValue, pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return false;
        }

        const pile = this.piles[pileIndex];

        // Skip-Bo cards can be played as any needed value
        if (cardValue === 'SB') {
            return true;
        }

        // Empty pile - only 1 or Skip-Bo can be played
        if (pile.length === 0) {
            return cardValue === 1;
        }

        // Get the top card of the pile
        const topCard = pile[pile.length - 1];
        const topValue = topCard === 'SB' ? this.getSkipBoValue(pile) : topCard;

        // Next card must be exactly one higher
        return cardValue === topValue + 1;
    }

    getSkipBoValue(pile) {
        // Find the last non-Skip-Bo card to determine what value the Skip-Bo represents
        for (let i = pile.length - 1; i >= 0; i--) {
            if (pile[i] !== 'SB') {
                return pile[i];
            }
        }
        // If all cards are Skip-Bo, the first one represents 1
        return pile.length;
    }

    playCard(cardValue, pileIndex) {
        if (!this.canPlayCard(cardValue, pileIndex)) {
            return false;
        }

        // Convert Skip-Bo cards to their actual numeric value
        let actualValue = cardValue;
        if (cardValue === 'SB') {
            const pile = this.piles[pileIndex];
            if (pile.length === 0) {
                actualValue = 1; // Skip-Bo on empty pile becomes 1
            } else {
                // Skip-Bo becomes the next needed value
                const topCard = pile[pile.length - 1];
                actualValue = topCard + 1;
            }
        }

        this.piles[pileIndex].push(actualValue);

        // Check if pile is complete (reached 12)
        if (this.isPileComplete(pileIndex)) {
            this.recyclePile(pileIndex);
        }

        return true;
    }

    isPileComplete(pileIndex) {
        const pile = this.piles[pileIndex];
        if (pile.length < 12) return false;

        // Calculate the effective value of the top card
        const topCard = pile[pile.length - 1];
        if (topCard === 'SB') {
            return this.getSkipBoValue(pile) >= 12;
        }
        return topCard === 12;
    }

    recyclePile(pileIndex) {
        // Clear the completed pile - cards go back to deck
        this.piles[pileIndex] = [];
    }

    getTopCard(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return null;
        }
        const pile = this.piles[pileIndex];
        return pile.length > 0 ? pile[pile.length - 1] : null;
    }

    getExpectedValue(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return null;
        }

        const pile = this.piles[pileIndex];
        if (pile.length === 0) {
            return 1;
        }

        const topCard = pile[pile.length - 1];
        const topValue = topCard === 'SB' ? this.getSkipBoValue(pile) : topCard;

        return topValue < 12 ? topValue + 1 : null;
    }

    getPileState(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.piles.length) {
            return null;
        }

        return {
            cards: [...this.piles[pileIndex]],
            topCard: this.getTopCard(pileIndex),
            expectedNext: this.getExpectedValue(pileIndex),
            isEmpty: this.piles[pileIndex].length === 0,
            isComplete: this.isPileComplete(pileIndex)
        };
    }

    getAllPiles() {
        return this.piles.map((pile, index) => this.getPileState(index));
    }
}
