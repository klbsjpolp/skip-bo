import CONFIG from './config.js';

// UI rendering and management module
class SkipBoUI {
    constructor(game) {
        this.game = game;
        this.initializeElements();
    }

    initializeElements() {
        this.elements = {
            deck: document.getElementById('deck'),
            deckCount: document.getElementById('deck-count'),
            buildPiles: document.getElementById('build-piles'),
            playerStock: document.getElementById('player-stock'),
            playerStockCount: document.getElementById('player-stock-count'),
            playerHand: document.getElementById('player-hand'),
            playerDiscardPiles: document.getElementById('player-discard-piles'),
            aiArea: document.getElementById('ai-area'),
            playerArea: document.getElementById('player-area'),
            aiStock: document.getElementById('ai-stock'),
            aiStockCount: document.getElementById('ai-stock-count'),
            aiHand: document.getElementById('ai-hand'),
            aiDiscardPiles: document.getElementById('ai-discard-piles'),
            messageBox: document.getElementById('message-box'),
            restartButton: document.getElementById('restart-button')
        };
    }

    createCardHTML(cardValue) {
        return `<span class="card-corner-number">${cardValue}</span><span>${cardValue}</span>`;
    }

    renderDiscardPile(pile, isPlayer, pileIndex) {
        const stack = document.createElement('div');
        stack.className = 'discard-pile-stack';
        stack.dataset.index = pileIndex;

        if (pile.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'placeholder';
            if (isPlayer) {
                placeholder.textContent = 'Défausser';
                placeholder.style.writingMode = 'vertical-rl';
                placeholder.style.textOrientation = 'mixed';
                placeholder.dataset.source = 'discard-placeholder';
            }
            stack.appendChild(placeholder);
        } else {
            pile.forEach((card, i) => {
                const cardEl = document.createElement('div');
                cardEl.className = `card ${card === 'SB' ? 'skipbo' : ''}`;
                cardEl.innerHTML = this.createCardHTML(card);
                cardEl.style.top = `${i * CONFIG.UI.CARD_STACK_OFFSET}px`;
                cardEl.style.zIndex = i;
                if (isPlayer && i === pile.length - 1) {
                    cardEl.dataset.card = card;
                    cardEl.dataset.source = 'discard';
                }
                stack.appendChild(cardEl);
            });
        }
        return stack;
    }

    updatePlayerUI() {
        const player = this.game.players[0];

        // Update stock
        this.elements.playerStockCount.textContent = player.stock.length.toString();
        this.elements.playerStock.innerHTML = player.stock.length > 0 ?
            this.createCardHTML(player.stock[player.stock.length - 1]) : '🏆';
        this.elements.playerStock.className = `card mx-auto ${
            player.stock.length > 0 && player.stock[player.stock.length - 1] === 'SB' ? 'skipbo' : ''
        }`;
        this.elements.playerStock.dataset.source = 'stock';

        // Update hand
        this.elements.playerHand.innerHTML = '';
        player.hand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `card ${card === 'SB' ? 'skipbo' : ''}`;
            cardEl.innerHTML = this.createCardHTML(card);
            cardEl.dataset.card = card;
            cardEl.dataset.source = 'hand';
            cardEl.dataset.index = index;
            this.elements.playerHand.appendChild(cardEl);
        });

        // Update discard piles
        this.elements.playerDiscardPiles.innerHTML = '';
        for (let i = 0; i < CONFIG.GAME.DISCARD_PILES_COUNT; i++) {
            const pileEl = this.renderDiscardPile(player.discard[i] || [], true, i);
            this.elements.playerDiscardPiles.appendChild(pileEl);
        }
    }

    updateAIUI() {
        const ai = this.game.players[1];

        // Update AI stock
        this.elements.aiStockCount.textContent = ai.stock.length.toString();
        if (ai.stock.length > 0) {
            const topCard = ai.stock[ai.stock.length - 1];
            this.elements.aiStock.innerHTML = this.createCardHTML(topCard);
            this.elements.aiStock.className = `card mx-auto ${topCard === 'SB' ? 'skipbo' : ''}`;
        } else {
            this.elements.aiStock.innerHTML = '🏆';
            this.elements.aiStock.className = 'card mx-auto';
        }

        // Update hand
        this.elements.aiHand.innerHTML = '';
        ai.hand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card back';
            cardEl.dataset.card = card;
            cardEl.dataset.source = 'hand';
            cardEl.dataset.index = index;
            this.elements.aiHand.appendChild(cardEl);
        });

        // Update AI discard piles
        this.elements.aiDiscardPiles.innerHTML = '';
        for (let i = 0; i < CONFIG.GAME.DISCARD_PILES_COUNT; i++) {
            const pileEl = this.renderDiscardPile(ai.discard[i] || [], false, i);
            this.elements.aiDiscardPiles.appendChild(pileEl);
        }
    }

    updateBuildPiles() {
        this.elements.buildPiles.innerHTML = '';
        this.game.buildPiles.forEach((pile, index) => {
            const pileEl = document.createElement('div');
            if (pile.length > 0) {
                pileEl.className = 'card';
                pileEl.innerHTML = this.createCardHTML(pile[pile.length - 1]);
            } else {
                pileEl.className = 'placeholder';
                pileEl.textContent = '1';
            }
            pileEl.dataset.pileIndex = index;
            this.elements.buildPiles.appendChild(pileEl);
        });
    }

    updateDeckUI() {
        this.elements.deckCount.textContent = this.game.deck.length;
        this.elements.deck.innerHTML = '';
    }

    updateActivePlayer() {
        const isPlayerTurn = this.game.currentPlayerIndex === 0;

        this.elements.playerArea.classList.toggle('active-turn', isPlayerTurn);
        this.elements.aiArea.classList.toggle('active-turn', !isPlayerTurn);
    }

    updateCursors() {
        // Reset all cursors
        document.querySelectorAll('.card, .placeholder').forEach(el => {
            el.style.cursor = 'default';
        });

        if (this.game.gameIsOver || this.game.currentPlayerIndex !== 0) return;

        // Set interactive cursors for player's turn
        this.elements.playerHand.querySelectorAll('.card').forEach(c => {
            c.style.cursor = 'grab';
        });

        if (this.game.players[0].stock.length > 0) {
            this.elements.playerStock.style.cursor = 'grab';
        }

        this.elements.playerDiscardPiles.querySelectorAll('.card').forEach(c => {
            if (parseInt(c.style.zIndex) === (c.parentElement.children.length - 1)) {
                c.style.cursor = 'grab';
            }
        });

        // Update cursors based on selection
        if (this.game.selectedCard) {
            this.updateSelectionCursors();
        }
    }

    updateSelectionCursors() {
        if (!this.game.selectedCard) return;

        // Update build pile cursors
        this.elements.buildPiles.querySelectorAll('.card, .placeholder').forEach((pileEl, pileIndex) => {
            const canPlay = this.game.canPlayCard(this.game.selectedCard.value, pileIndex);
            pileEl.style.cursor = canPlay ? 'copy' : 'not-allowed';
        });

        // Update discard pile cursors for hand cards
        if (this.game.selectedCard.source === 'hand') {
            this.elements.playerDiscardPiles.querySelectorAll('.discard-pile-stack').forEach(stack => {
                stack.style.cursor = 'copy';
                stack.querySelectorAll('*').forEach(el => {
                    el.style.cursor = 'copy';
                });
            });
        }
    }

    showMessage(message, duration = CONFIG.UI.MESSAGE_DISPLAY_DURATION) {
        this.elements.messageBox.textContent = message;
        if (duration > 0) {
            setTimeout(() => {
                if (!this.game.gameIsOver) {
                    this.elements.messageBox.textContent = "";
                }
            }, duration);
        }
    }

    showGameEnd(isAIWinner) {
        const message = isAIWinner ? CONFIG.MESSAGES.AI_WINS : CONFIG.MESSAGES.PLAYER_WINS;
        this.showMessage(message, 0);
        this.elements.restartButton.classList.remove('hidden');
        this.elements.playerArea.classList.remove('active-turn');
        this.elements.aiArea.classList.remove('active-turn');
    }

    hideRestartButton() {
        this.elements.restartButton.classList.add('hidden');
    }

    updateUI() {
        this.updatePlayerUI();
        this.updateAIUI();
        this.updateBuildPiles();
        this.updateDeckUI();
        this.updateActivePlayer();
        this.updateCursors();
    }

    clearSelection() {
        if (this.game.selectedCard && this.game.selectedCard.element) {
            this.game.selectedCard.element.classList.remove('selected');
        }
        this.game.clearSelection();
        this.updateCursors();
    }

    setSelection(cardData) {
        this.clearSelection();
        this.game.setSelection(cardData);
        if (cardData.element) {
            cardData.element.classList.add('selected');
        }
        this.updateCursors();
    }
}

export default SkipBoUI;
