import CONFIG from './config.js';

export class Card {
    constructor(value) {
        this.value = value;
    }

    isSkipBo() {
        return this.value === 'SB';
    }

    getNumericValue(contextValue = 1) {
        return this.isSkipBo() ? contextValue : this.value;
    }

    canPlayOn(topCardValue) {
        const expectedValue = topCardValue + 1;
        if (this.isSkipBo()) return true;
        return this.value === expectedValue;
    }

    toString() {
        return this.value.toString();
    }

    static createDeck() {
        const cards = [];

        // Add numbered cards (1-12, 12 of each)
        for (let i = 0; i < 12; i++) {
            for (let j = 1; j <= CONFIG.GAME.MAX_BUILD_PILE_VALUE; j++) {
                cards.push(j); // Return simple numeric values instead of Card objects
            }
        }

        // Add Skip-Bo cards
        for (let i = 0; i < CONFIG.GAME.SKIP_BO_CARDS; i++) {
            cards.push('SB'); // Return simple string values instead of Card objects
        }

        return cards;
    }
}
