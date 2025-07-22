import CONFIG from './config.js';
import SkipBoGame from './game.js';
import SkipBoUI from './ui.js';
import AIPlayer from './aiPlayer.js';
import ThemeManager from './themeManager.js';

export default class GameController {
    constructor() {
        this.game = new SkipBoGame();
        this.ui = new SkipBoUI(this.game);
        this.ai = new AIPlayer(this.game, this.ui);
        this.themeManager = new ThemeManager();
        this.initEventListeners();
        this.initGame();
    }

    initEventListeners() {
        // Player area click handler
        document.getElementById('player-area').addEventListener('click', (e) => {
            this.handlePlayerAreaClick(e);
        });

        // Build pile click handler
        document.getElementById('build-piles').addEventListener('click', (e) => {
            this.handleBuildPileClick(e);
        });

        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.initGame();
        });
    }

    handlePlayerAreaClick(e) {
        if (this.game.currentPlayerIndex !== 0 || this.game.gameIsOver) return;

        const target = e.target;
        const discardPileStack = target.closest('.discard-pile-stack');

        // Handle discarding
        if (this.game.selectedCard && this.game.selectedCard.source === 'hand' && discardPileStack) {
            const discardPileIndex = parseInt(discardPileStack.dataset.index);
            this.game.discardCard(0, this.game.selectedCard.index, discardPileIndex);
            this.endTurn();
            return;
        }

        // Handle card selection
        const cardElement = target.closest('[data-source]');
        if (!cardElement) return;

        const source = cardElement.dataset.source;
        let index = source === 'discard' ?
            parseInt(target.closest('.discard-pile-stack').dataset.index) :
            parseInt(cardElement.dataset.index);

        this.selectCard(cardElement, source, index);
    }

    selectCard(cardElement, source, index) {
        const player = this.game.players[0];

        if (source === 'stock' && player.stock.length === 0) return;

        let cardValue;
        if (source === 'stock') {
            cardValue = player.stock[player.stock.length - 1];
        } else {
            const cardStr = cardElement.dataset.card;
            cardValue = cardStr === 'SB' ? 'SB' : parseInt(cardStr);
        }

        if (this.game.selectedCard && this.game.selectedCard.element === cardElement) {
            this.ui.clearSelection();
        } else {
            this.ui.setSelection({
                value: cardValue,
                source: source,
                index: index,
                element: cardElement
            });
        }
    }

    handleBuildPileClick(e) {
        if (this.game.currentPlayerIndex !== 0 || this.game.gameIsOver || !this.game.selectedCard) return;

        const target = e.target.closest('[data-pile-index]');
        if (!target) return;

        const pileIndex = parseInt(target.dataset.pileIndex);
        const played = this.game.playCard(
            0,
            this.game.selectedCard.value,
            this.game.selectedCard.source,
            this.game.selectedCard.index,
            pileIndex
        );

        if (played) {
            const winResult = this.game.checkForWinner();
            if (winResult.hasWinner) {
                this.handleGameEnd(winResult);
                return;
            }

            // Store the source before clearing selection
            const wasFromHand = this.game.selectedCard?.source === 'hand';

            this.ui.clearSelection();
            this.ui.updateUI();

            // Check if hand is empty and refill
            if (wasFromHand && this.game.players[0].hand.length === 0) {
                this.ui.showMessage(CONFIG.MESSAGES.HAND_EMPTY_REFILL, CONFIG.UI.HAND_REFILL_DELAY);
                setTimeout(() => {
                    this.game.drawHand(0);
                    this.ui.showMessage(CONFIG.MESSAGES.PLAYER_TURN, 0);
                    this.ui.updateUI();
                }, CONFIG.UI.HAND_REFILL_DELAY);
            }
        }
    }

    initGame() {
        this.game.initializeGame();
        this.ui.hideRestartButton();
        this.game.drawHand(this.game.currentPlayerIndex+1 % 2);
        this.startTurn();
    }

    startTurn() {
        const winResult = this.game.checkForWinner();
        if (winResult.hasWinner) {
            this.handleGameEnd(winResult);
            return;
        }

        const drawResult = this.game.drawHand(this.game.currentPlayerIndex);
        if (!drawResult.success) {
            this.ui.showMessage(drawResult.message, 0);
            return;
        }

        this.ui.updateUI();

        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer.isAI) {
            this.ui.showMessage(CONFIG.MESSAGES.AI_TURN, 0);
            setTimeout(() => this.ai.playTurn(), CONFIG.UI.AI_TURN_DELAY);
        } else {
            this.ui.showMessage(CONFIG.MESSAGES.PLAYER_TURN, 0);
        }
    }

    endTurn() {
        if (this.game.gameIsOver) return;
        this.ui.clearSelection();
        this.game.switchTurn();
        this.startTurn();
    }

    handleGameEnd(winResult) {
        this.game.gameState.endGame(winResult.winnerIndex);
        this.ui.showGameEnd(winResult.isAI);
        this.ui.updateCursors();
    }
}
