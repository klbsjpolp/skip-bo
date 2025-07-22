import CONFIG from './config.js';

// Game logic module
class SkipBoGame {
    constructor() {
        this.deck = [];
        this.buildPiles = [[], [], [], []];
        this.completedBuildPileCards = []; // Initialize storage for completed build pile cards
        this.players = [
            { stock: [], hand: [], discard: [[], [], [], []], isAI: false },
            { stock: [], hand: [], discard: [[], [], [], []], isAI: true }
        ];
        this.currentPlayerIndex = 0;
        this.gameIsOver = false;
        this.selectedCard = null;
    }

    createDeck() {
        const newDeck = [];
        for (let i = 0; i < 12; i++) {
            for (let j = 1; j <= CONFIG.GAME.MAX_BUILD_PILE_VALUE; j++) {
                newDeck.push(j);
            }
        }
        for (let i = 0; i < CONFIG.GAME.SKIPBO_CARDS_COUNT; i++) {
            newDeck.push('SB');
        }
        return newDeck;
    }

    shuffleDeck(deckToShuffle) {
        for (let i = deckToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
        }
    }

    dealCards() {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].stock = this.deck.splice(0, CONFIG.GAME.STOCK_PILE_SIZE);
        }
    }

    reshuffleCompletedBuildPiles() {
        let newDeckCards = [];

        // Check for any completed build pile cards we've stored
        if (this.completedBuildPileCards && this.completedBuildPileCards.length > 0) {
            newDeckCards.push(...this.completedBuildPileCards);
            this.completedBuildPileCards = [];
        }

        // Also check for any build piles that are currently at 12 cards
        this.buildPiles.forEach((pile, index) => {
            if (pile.length === 12) {
                newDeckCards.push(...pile);
                this.buildPiles[index] = [];
            }
        });

        if (newDeckCards.length > 0) {
            this.shuffleDeck(newDeckCards);
            this.deck = newDeckCards;
            return { success: true, count: newDeckCards.length };
        }
        return { success: false, count: 0 };
    }

    drawHand(playerIndex) {
        const player = this.players[playerIndex];
        const cardsNeeded = CONFIG.GAME.HAND_SIZE - player.hand.length;

        for (let i = 0; i < cardsNeeded; i++) {
            if (this.deck.length === 0) {
                const reshuffleResult = this.reshuffleCompletedBuildPiles();
                if (!reshuffleResult.success) {
                    return { success: false, message: CONFIG.MESSAGES.DECK_EMPTY_NO_CARDS };
                }
            }
            if (this.deck.length > 0) {
                player.hand.push(this.deck.pop());
            }
        }
        return { success: true };
    }

    canPlayCard(card, pileIndex) {
        const topCard = this.buildPiles[pileIndex].length > 0 ?
            this.buildPiles[pileIndex][this.buildPiles[pileIndex].length - 1] : 0;
        const numericCardValue = card === 'SB' ? topCard + 1 : card;
        return numericCardValue === topCard + 1;
    }

    playCard(playerIndex, card, source, sourceIndex, targetPileIndex = null) {
        const player = this.players[playerIndex];

        const executePlay = (pileIndex) => {
            if (!this.canPlayCard(card, pileIndex)) return false;

            const numericCardValue = card === 'SB' ?
                (this.buildPiles[pileIndex].length > 0 ? this.buildPiles[pileIndex][this.buildPiles[pileIndex].length - 1] + 1 : 1) :
                card;

            this.buildPiles[pileIndex].push(numericCardValue);

            // Remove card from source
            if (source === 'stock') player.stock.pop();
            else if (source === 'hand') player.hand.splice(sourceIndex, 1);
            else if (source === 'discard') player.discard[sourceIndex].pop();

            // Check if this build pile is now complete (12 cards) and clear it
            if (this.buildPiles[pileIndex].length === 12) {
                const completedCards = this.buildPiles[pileIndex];
                this.buildPiles[pileIndex] = [];

                // Add completed cards to a temporary storage for later shuffling
                if (!this.completedBuildPileCards) {
                    this.completedBuildPileCards = [];
                }
                this.completedBuildPileCards.push(...completedCards);
            }

            return true;
        };

        if (targetPileIndex !== null) {
            return executePlay(targetPileIndex);
        } else {
            // AI logic - try all piles
            for (let i = 0; i < this.buildPiles.length; i++) {
                if (executePlay(i)) return true;
            }
        }
        return false;
    }

    discardCard(playerIndex, cardIndex, discardPileIndex) {
        const player = this.players[playerIndex];
        if (player.hand.length === 0 || cardIndex >= player.hand.length) return false;

        const cardToDiscard = player.hand.splice(cardIndex, 1)[0];
        player.discard[discardPileIndex].push(cardToDiscard);
        return true;
    }

    checkForWinner() {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].stock.length === 0) {
                return {
                    hasWinner: true,
                    winnerIndex: i,
                    isAI: this.players[i].isAI
                };
            }
        }
        return { hasWinner: false };
    }

    initGame() {
        this.deck = this.createDeck();
        this.shuffleDeck(this.deck);
        this.buildPiles = [[], [], [], []];
        this.completedBuildPileCards = []; // Reset completed build pile cards storage
        this.players = [
            { stock: [], hand: [], discard: [[], [], [], []], isAI: false },
            { stock: [], hand: [], discard: [[], [], [], []], isAI: true }
        ];
        this.gameIsOver = false;
        this.currentPlayerIndex = 0;
        this.selectedCard = null;
        this.dealCards();
        return true;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    switchTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }

    clearSelection() {
        this.selectedCard = null;
    }

    setSelection(card) {
        this.selectedCard = card;
    }
}

export default SkipBoGame;
