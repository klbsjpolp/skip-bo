import CONFIG from './config.js';

export default class AIPlayer {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
    }

    async playTurn() {
        if (this.game.gameIsOver) return;

        const ai = this.game.players[1];

        // Try to play from stock
        if (ai.stock.length > 0) {
            const stockCard = ai.stock[ai.stock.length - 1];
            if (this.game.playCard(1, stockCard, 'stock')) {
                await this.delay(CONFIG.UI.AI_PLAY_DELAY);
                this.checkAndContinue();
                return;
            }
        }

        // Try to play from hand
        for (let i = 0; i < ai.hand.length; i++) {
            if (this.game.playCard(1, ai.hand[i], 'hand', i)) {
                await this.delay(CONFIG.UI.AI_PLAY_DELAY);
                this.checkAndContinue();
                return;
            }
        }

        // Try to play from discard piles
        for (let i = 0; i < ai.discard.length; i++) {
            if (ai.discard[i].length > 0) {
                const discardCard = ai.discard[i][ai.discard[i].length - 1];
                if (this.game.playCard(1, discardCard, 'discard', i)) {
                    await this.delay(CONFIG.UI.AI_PLAY_DELAY);
                    this.checkAndContinue();
                    return;
                }
            }
        }

        // Discard if no plays available
        if (ai.hand.length > 0) {
            const emptyDiscardIndex = ai.discard.findIndex(pile => pile.length === 0);
            const discardIndex = emptyDiscardIndex !== -1 ? emptyDiscardIndex : 0;
            this.game.discardCard(1, ai.hand.length - 1, discardIndex);
        }

        window.gameController.endTurn();
    }

    checkAndContinue() {
        const winResult = this.game.checkForWinner();
        if (winResult.hasWinner) {
            window.gameController.handleGameEnd(winResult);
            return;
        }

        this.ui.updateUI();
        setTimeout(() => this.playTurn(), CONFIG.UI.AI_PLAY_DELAY);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
