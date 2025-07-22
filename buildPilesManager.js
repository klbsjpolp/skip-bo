import CONFIG from './config.js';

export class BuildPilesManager {
    constructor() {
        this.piles = [[], [], [], []];
    }

    canPlayCard(card, pileIndex) {
        const pile = this.piles[pileIndex];
        const topValue = pile.length > 0 ? pile[pile.length - 1] : 0;
        const cardValue = card === 'SB' ? topValue + 1 : card;
        return cardValue === topValue + 1;
    }

    playCard(card, pileIndex) {
        if (!this.canPlayCard(card, pileIndex)) {
            return { success: false, message: 'Invalid move' };
        }

        const pile = this.piles[pileIndex];
        const cardValue = card === 'SB' ?
            (pile.length > 0 ? pile[pile.length - 1] + 1 : 1) : card;

        pile.push(cardValue);

        // Check if pile is complete
        if (pile.length === CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
            const completedCards = [...pile];
            pile.length = 0; // Clear the pile
            return {
                success: true,
                completed: true,
                completedCards,
                pileIndex
            };
        }

        return { success: true, completed: false };
    }

    getTopCard(pileIndex) {
        const pile = this.piles[pileIndex];
        return pile.length > 0 ? pile[pile.length - 1] : 0;
    }

    isEmpty(pileIndex) {
        return this.piles[pileIndex].length === 0;
    }

    getNextExpectedValue(pileIndex) {
        return this.getTopCard(pileIndex) + 1;
    }

    reset() {
        this.piles = [[], [], [], []];
    }

    getState() {
        return this.piles.map(pile => [...pile]);
    }

    findValidPiles(card) {
        return this.piles
            .map((pile, index) => ({ pile, index }))
            .filter(({ pile, index }) => this.canPlayCard(card, index))
            .map(({ index }) => index);
    }
}
