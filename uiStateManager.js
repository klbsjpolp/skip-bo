import CONFIG from './config.js';

export class UIStateManager {
    constructor(ui) {
        this.ui = ui;
        this.currentTheme = localStorage.getItem(CONFIG.THEMES.STORAGE_KEY) || CONFIG.THEMES.DEFAULT;
        this.animations = new Map();
        this.messageTimeout = null;
    }

    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        this.currentTheme = theme;
        localStorage.setItem(CONFIG.THEMES.STORAGE_KEY, theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    showMessage(message, type = 'info', duration = CONFIG.UI.MESSAGE_DISPLAY_DURATION) {
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        const messageBox = this.ui.elements.messageBox;
        messageBox.textContent = message;
        messageBox.className = `message ${type}`;
        messageBox.style.display = 'block';

        this.messageTimeout = setTimeout(() => {
            messageBox.style.display = 'none';
        }, duration);
    }

    animateCardPlay(cardElement, targetElement) {
        const animationId = `card-play-${Date.now()}`;

        const startRect = cardElement.getBoundingClientRect();
        const endRect = targetElement.getBoundingClientRect();

        const clone = cardElement.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = `${startRect.left}px`;
        clone.style.top = `${startRect.top}px`;
        clone.style.zIndex = '1000';
        clone.style.transition = 'all 0.5s ease-in-out';

        document.body.appendChild(clone);

        requestAnimationFrame(() => {
            clone.style.left = `${endRect.left}px`;
            clone.style.top = `${endRect.top}px`;
            clone.style.transform = 'scale(0.8)';
            clone.style.opacity = '0.7';
        });

        const animation = setTimeout(() => {
            document.body.removeChild(clone);
            this.animations.delete(animationId);
        }, 500);

        this.animations.set(animationId, animation);
    }

    highlightValidMoves(validPiles) {
        // Remove existing highlights
        document.querySelectorAll('.valid-drop-zone').forEach(el => {
            el.classList.remove('valid-drop-zone');
        });

        // Add highlights to valid piles
        validPiles.forEach(pileIndex => {
            const pileElement = document.querySelector(`[data-pile-index="${pileIndex}"]`);
            if (pileElement) {
                pileElement.classList.add('valid-drop-zone');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.valid-drop-zone, .selected-card, .highlighted').forEach(el => {
            el.classList.remove('valid-drop-zone', 'selected-card', 'highlighted');
        });
    }

    updatePlayerIndicator(currentPlayerIndex) {
        document.querySelectorAll('.player-area').forEach((area, index) => {
            area.classList.toggle('active-player', index === currentPlayerIndex);
        });
    }

    showCardCount(element, count) {
        let countElement = element.querySelector('.card-count');
        if (!countElement) {
            countElement = document.createElement('span');
            countElement.className = 'card-count';
            element.appendChild(countElement);
        }
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'block' : 'none';
    }

    cleanup() {
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.animations.forEach(animation => {
            clearTimeout(animation);
        });
        this.animations.clear();
    }
}
