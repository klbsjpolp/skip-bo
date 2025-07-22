import CONFIG from './config.js';

export class Player {
    constructor(isAI = false) {
        this.stock = [];
        this.hand = [];
        this.discard = [[], [], [], []];
        this.isAI = isAI;
    }

    getTopStockCard() {
        return this.stock.length > 0 ? this.stock[this.stock.length - 1] : null;
    }

    getTopDiscardCard(pileIndex) {
        const pile = this.discard[pileIndex];
        return pile.length > 0 ? pile[pile.length - 1] : null;
    }

    canPlayFromStock() {
        return this.stock.length > 0;
    }

    canPlayFromDiscard(pileIndex) {
        return this.discard[pileIndex].length > 0;
    }

    removeCardFromStock() {
        return this.stock.pop();
    }

    removeCardFromHand(index) {
        return this.hand.splice(index, 1)[0];
    }

    removeCardFromDiscard(pileIndex) {
        return this.discard[pileIndex].pop();
    }

    addCardToHand(card) {
        this.hand.push(card);
    }

    addCardToDiscard(card, pileIndex) {
        this.discard[pileIndex].push(card);
    }

    needsCards() {
        return this.hand.length < CONFIG.GAME.HAND_SIZE;
    }

    hasWon() {
        return this.stock.length === 0;
    }

    isEmpty() {
        return this.stock.length === 0 &&
               this.hand.length === 0 &&
               this.discard.every(pile => pile.length === 0);
    }
}
