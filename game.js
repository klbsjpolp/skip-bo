import CONFIG from './config.js';
import { Player } from './player.js';
import { Deck } from './deck.js';
import { BuildPilesManager } from './buildPilesManager.js';
import { GameStateManager } from './gameStateManager.js';
import { ValidationService } from './validationService.js';

export default class SkipBoGame {
    constructor() {
        this.deck = new Deck();
        this.buildPiles = new BuildPilesManager();
        this.gameState = new GameStateManager();
        this.selectedCard = null;
        this.gameIsOver = false;
        this.currentPlayerIndex = 0;

        this.players = [
            new Player(false), // Human player
            new Player(true)   // AI player
        ];
    }

    initializeGame() {
        this.deck.create().shuffle();
        this.buildPiles.reset();
        this.gameState.reset();
        this.gameIsOver = false;
        this.currentPlayerIndex = 0;
        this.selectedCard = null;

        // Deal stock piles
        this.dealCards();

        // Draw initial hands
        this.drawInitialHands();
    }

    dealCards() {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].stock = [];
            this.players[i].hand = [];
            this.players[i].discard = [[], [], [], []];

            for (let j = 0; j < CONFIG.GAME.STOCK_PILE_SIZE; j++) {
                if (this.deck.size() > 0) {
                    this.players[i].stock.push(this.deck.draw());
                }
            }
        }
    }

    drawInitialHands() {
        this.players.forEach((player, index) => {
            this.drawHand(index);
        });
    }

    drawHand(playerIndex) {
        const player = this.players[playerIndex];

        // Fill hand to 5 cards
        while (player.hand.length < CONFIG.GAME.HAND_SIZE && this.deck.size() > 0) {
            player.hand.push(this.deck.draw());
        }

        return {
            success: true,
            message: 'Hand drawn successfully'
        };
    }

    playCard(playerIndex, cardValue, source, sourceIndex = 0, targetPileIndex = null) {
        const player = this.players[playerIndex];

        // If no target pile specified, find the first valid one
        if (targetPileIndex === null) {
            for (let i = 0; i < this.buildPiles.piles.length; i++) {
                if (this.buildPiles.canPlayCard(cardValue, i)) {
                    targetPileIndex = i;
                    break;
                }
            }
        }

        // Validate the play
        if (targetPileIndex === null || !this.buildPiles.canPlayCard(cardValue, targetPileIndex)) {
            return false;
        }

        // Remove card from source
        let removedCard;
        if (source === 'stock') {
            if (player.stock.length === 0) return false;
            removedCard = player.stock.pop();
        } else if (source === 'hand') {
            if (sourceIndex < 0 || sourceIndex >= player.hand.length) return false;
            removedCard = player.hand.splice(sourceIndex, 1)[0];
        } else if (source === 'discard') {
            if (sourceIndex < 0 || sourceIndex >= player.discard.length) return false;
            if (player.discard[sourceIndex].length === 0) return false;
            removedCard = player.discard[sourceIndex].pop();
        } else {
            return false;
        }

        // Verify the card matches what we expected
        if (removedCard !== cardValue) {
            // Put the card back if there's a mismatch
            if (source === 'stock') {
                player.stock.push(removedCard);
            } else if (source === 'hand') {
                player.hand.splice(sourceIndex, 0, removedCard);
            } else if (source === 'discard') {
                player.discard[sourceIndex].push(removedCard);
            }
            return false;
        }

        // Play the card to the build pile
        const success = this.buildPiles.playCard(cardValue, targetPileIndex);

        if (!success) {
            // Put the card back if play failed
            if (source === 'stock') {
                player.stock.push(removedCard);
            } else if (source === 'hand') {
                player.hand.splice(sourceIndex, 0, removedCard);
            } else if (source === 'discard') {
                player.discard[sourceIndex].push(removedCard);
            }
            return false;
        }

        return true;
    }

    discardCard(playerIndex, handIndex, discardPileIndex) {
        const player = this.players[playerIndex];

        if (handIndex < 0 || handIndex >= player.hand.length) return false;
        if (discardPileIndex < 0 || discardPileIndex >= player.discard.length) return false;

        const card = player.hand.splice(handIndex, 1)[0];
        player.discard[discardPileIndex].push(card);

        return true;
    }

    switchTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    checkForWinner() {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].stock.length === 0) {
                this.gameIsOver = true;
                return {
                    hasWinner: true,
                    winnerIndex: i,
                    isAI: this.players[i].isAI
                };
            }
        }

        return {
            hasWinner: false,
            winnerIndex: -1,
            isAI: false
        };
    }

    // Selection methods for UI
    setSelection(cardData) {
        this.selectedCard = cardData;
    }

    clearSelection() {
        this.selectedCard = null;
    }

    // Validation methods
    canPlayCard(cardValue, pileIndex) {
        return this.buildPiles.canPlayCard(cardValue, pileIndex);
    }

    validateMove(playerIndex, cardValue, source, sourceIndex, targetPileIndex) {
        return ValidationService.isValidBuildPilePlay(cardValue, this.buildPiles.piles[targetPileIndex]);
    }

    getPlayableCards(playerIndex) {
        return ValidationService.getPlayableCards(this.players[playerIndex], this.buildPiles);
    }

    validateGameState() {
        return ValidationService.validateGameState(this);
    }

    // Getters for UI
    get buildPilesState() {
        return this.buildPiles.getAllPiles();
    }

    get deckCount() {
        return this.deck.size();
    }

    get isGameOver() {
        return this.gameIsOver;
    }
}
