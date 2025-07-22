import { Card } from './card.js';

export class Deck {
    constructor() {
        this.cards = [];
        this.completedBuildPileCards = [];
    }

    create() {
        this.cards = Card.createDeck();
        return this;
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this;
    }

    draw() {
        return this.cards.pop();
    }

    isEmpty() {
        return this.cards.length === 0;
    }

    size() {
        return this.cards.length;
    }

    addCompletedBuildPile(cards) {
        this.completedBuildPileCards.push(...cards);
    }

    reshuffleFromCompletedPiles(buildPiles) {
        let newCards = [...this.completedBuildPileCards];
        this.completedBuildPileCards = [];

        // Check for completed build piles (12 cards)
        buildPiles.forEach((pile) => {
            if (pile.length === 12) {
                newCards.push(...pile);
                pile.length = 0; // Clear the pile
            }
        });

        if (newCards.length > 0) {
            this.cards = newCards;
            this.shuffle();
            return { success: true, count: newCards.length };
        }

        return { success: false, count: 0 };
    }
}
