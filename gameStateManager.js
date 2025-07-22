
export class GameStateManager {
    constructor() {
        this.currentPlayerIndex = 0;
        this.gamePhase = 'playing'; // 'playing', 'ended'
        this.selectedCard = null;
        this.turnActions = [];
    }

    getCurrentPlayer(players) {
        return players[this.currentPlayerIndex];
    }

    switchTurn(players) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % players.length;
        this.clearTurnData();
    }

    clearTurnData() {
        this.selectedCard = null;
        this.turnActions = [];
    }

    addAction(action) {
        this.turnActions.push({
            ...action,
            timestamp: Date.now()
        });
    }

    canEndTurn() {
        return this.turnActions.some(action => action.type === 'discard');
    }

    isGameOver() {
        return this.gamePhase === 'ended';
    }

    endGame(winnerIndex) {
        this.gamePhase = 'ended';
        this.addAction({
            type: 'game_end',
            winnerIndex,
            playerIndex: winnerIndex
        });
    }

    reset() {
        this.currentPlayerIndex = 0;
        this.gamePhase = 'playing';
        this.clearTurnData();
    }

    getGameStats(players) {
        return {
            currentPlayer: this.currentPlayerIndex,
            gamePhase: this.gamePhase,
            actionsThisTurn: this.turnActions.length,
            playersRemaining: players.filter(p => !p.hasWon()).length
        };
    }
}
