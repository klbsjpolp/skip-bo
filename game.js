import CONFIG from './config.js';
import { Player } from './player.js';
import { Deck } from './deck.js';
import { BuildPilesManager } from './buildPilesManager.js';
import { GameStateManager } from './gameStateManager.js';
import { AIStrategy } from './aiStrategy.js';
import { GameEvents } from './gameEvents.js';

// Game logic module
class SkipBoGame {
    constructor() {
        this.deck = new Deck();
        this.buildPiles = new BuildPilesManager();
        this.gameState = new GameStateManager();
        this.events = new GameEvents();
        this.aiStrategy = new AIStrategy();

        this.players = [
            new Player(false), // Human player
            new Player(true)   // AI player
        ];
    }

    initializeGame() {
        this.deck.create().shuffle();
        this.dealCards();
        this.drawInitialHands();
        this.gameState.reset();

        this.events.emit('gameInitialized', {
            players: this.players,
            deck: this.deck,
            buildPiles: this.buildPiles
        });
    }

    dealCards() {
        for (let i = 0; i < this.players.length; i++) {
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

        while (player.needsCards() && this.deck.size() > 0) {
            player.addCardToHand(this.deck.draw());
        }

        // If deck is empty, try to reshuffle
        if (player.needsCards() && this.deck.isEmpty()) {
            const reshuffleResult = this.deck.reshuffleFromCompletedPiles(this.buildPiles.piles);

            if (reshuffleResult.success) {
                this.events.emit('deckReshuffled', reshuffleResult);

                // Continue drawing after reshuffle
                while (player.needsCards() && this.deck.size() > 0) {
                    player.addCardToHand(this.deck.draw());
                }
            } else {
                this.events.emit('deckEmpty', { playerIndex });
                return { success: false, message: CONFIG.MESSAGES.DECK_EMPTY_NO_CARDS };
            }
        }

        return { success: true };
    }

    canPlayCard(card, pileIndex) {
        return this.buildPiles.canPlayCard(card, pileIndex);
    }

    playCard(playerIndex, card, source, sourceIndex, targetPileIndex = null) {
        const player = this.players[playerIndex];

        const executePlay = (pileIndex) => {
            const result = this.buildPiles.playCard(card, pileIndex);

            if (!result.success) return false;

            // Remove card from source
            this.removeCardFromSource(player, source, sourceIndex);

            // Handle completed build pile
            if (result.completed) {
                this.deck.addCompletedBuildPile(result.completedCards);
                this.events.emit('buildPileCompleted', result);
            }

            this.gameState.addAction({
                type: 'play',
                playerIndex,
                card,
                source,
                sourceIndex,
                targetPile: pileIndex
            });

            this.events.emit('cardPlayed', {
                playerIndex,
                card,
                source,
                targetPile: pileIndex,
                result
            });

            return true;
        };

        if (targetPileIndex !== null) {
            return executePlay(targetPileIndex);
        } else {
            // AI logic - try all piles
            for (let i = 0; i < this.buildPiles.piles.length; i++) {
                if (executePlay(i)) return true;
            }
        }
        return false;
    }

    removeCardFromSource(player, source, sourceIndex) {
        switch (source) {
            case 'stock':
                player.removeCardFromStock();
                break;
            case 'hand':
                player.removeCardFromHand(sourceIndex);
                break;
            case 'discard':
                player.removeCardFromDiscard(sourceIndex);
                break;
        }
    }

    discardCard(playerIndex, cardIndex, discardPileIndex) {
        const player = this.players[playerIndex];
        if (player.hand.length === 0 || cardIndex >= player.hand.length) return false;

        const card = player.removeCardFromHand(cardIndex);
        player.addCardToDiscard(card, discardPileIndex);

        this.gameState.addAction({
            type: 'discard',
            playerIndex,
            card,
            discardPile: discardPileIndex
        });

        this.events.emit('cardDiscarded', {
            playerIndex,
            card,
            discardPile: discardPileIndex
        });

        return true;
    }

    checkForWinner() {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hasWon()) {
                this.gameState.endGame(i);
                this.events.emit('gameEnded', {
                    winnerIndex: i,
                    isAI: this.players[i].isAI
                });
                return {
                    hasWinner: true,
                    winnerIndex: i
                };
            }
        }
        return { hasWinner: false };
    }

    getCurrentPlayer() {
        return this.gameState.getCurrentPlayer(this.players);
    }

    switchTurn() {
        this.gameState.switchTurn(this.players);
        this.events.emit('turnChanged', {
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            currentPlayer: this.getCurrentPlayer()
        });
    }

    executeAITurn() {
        const aiPlayer = this.players[1];
        const move = this.aiStrategy.findBestMove(aiPlayer, this.buildPiles.piles, this.gameState);

        if (!move) return false;

        if (move.type === 'play') {
            return this.playCard(1, move.card, move.source, move.sourceIndex, move.targetPile);
        } else if (move.type === 'discard') {
            return this.discardCard(1, move.sourceIndex, move.targetPile);
        }

        return false;
    }

    getGameState() {
        return {
            players: this.players,
            buildPiles: this.buildPiles.getState(),
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            deckSize: this.deck.size(),
            gameStats: this.gameState.getGameStats(this.players)
        };
    }

    // Legacy compatibility methods - can be removed once UI is updated
    get currentPlayerIndex() {
        return this.gameState.currentPlayerIndex;
    }

    get gameIsOver() {
        return this.gameState.isGameOver();
    }

    get selectedCard() {
        return this.gameState.selectedCard;
    }

    set selectedCard(value) {
        this.gameState.selectedCard = value;
    }

    // Legacy methods for backward compatibility with existing UI
    createDeck() {
        return this.deck.create().cards;
    }

    shuffleDeck() {
        this.deck.shuffle();
    }

    reshuffleCompletedBuildPiles() {
        return this.deck.reshuffleFromCompletedPiles(this.buildPiles.piles);
    }

    // Selection methods for UI compatibility
    clearSelection() {
        this.gameState.selectedCard = null;
    }

    setSelection(cardData) {
        this.gameState.selectedCard = cardData;
    }

    getSelection() {
        return this.gameState.selectedCard;
    }
}

export default SkipBoGame;
