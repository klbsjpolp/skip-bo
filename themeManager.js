import CONFIG from './config.js';

// Apply theme on initial load to prevent FOUC
(function() {
    const theme = localStorage.getItem('skipbo_theme') || 'light';
    document.documentElement.classList.add(`theme-${theme}`);
})();

export default class ThemeManager {
    constructor() {
        this.themeSwitcher = document.querySelector('.theme-switcher');
        this.bodyElement = document.body;
        this.init();
    }

    init() {
        this.loadTheme();
        this.themeSwitcher.addEventListener('click', (e) => {
            const theme = e.target.dataset.theme;
            if (theme) {
                this.applyTheme(theme);
                this.saveTheme(theme);
            }
        });
    }

    applyTheme(themeName) {
        this.bodyElement.className = this.bodyElement.className.replace(/theme-\w+/g, '');
        this.bodyElement.classList.add(`theme-${themeName}`);

        this.themeSwitcher.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeName);
        });
    }

    saveTheme(themeName) {
        localStorage.setItem(CONFIG.THEMES.STORAGE_KEY, themeName);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem(CONFIG.THEMES.STORAGE_KEY) || CONFIG.THEMES.DEFAULT;
        document.body.className = '';
        this.applyTheme(savedTheme);
    }
}
