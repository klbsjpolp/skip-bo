import GameController from './gameController.js';

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const gameController = new GameController();

    // Make gameController available globally for AI callbacks
    window.gameController = gameController;
});
