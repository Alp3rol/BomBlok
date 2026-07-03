import { themeBtnEl, themeMenuEl } from './state.js';
import { resizeCanvas } from './particles.js';

// --- THEME MANAGER ---
export const THEME_LABELS = {
    dark: '🌙 Karanlık',
    neon: '⚡ Neon',
    wood: '🪵 Ahşap',
    candy: '🍭 Şeker',
    cosmos: '🌌 Uzay',
    retro: '👾 Retro',
    seasons: '🍂 Mevsimler'
};

function setThemeButtonLabel(themeName) {
    if (!themeBtnEl) return;
    themeBtnEl.textContent = THEME_LABELS[themeName] || themeName;
}

function closeThemeMenu() {
    if (!themeMenuEl || !themeBtnEl) return;
    if (themeMenuEl.classList.contains('hidden')) return;
    themeMenuEl.classList.add('hidden');
    themeBtnEl.setAttribute('aria-expanded', 'false');
}

function toggleThemeMenu() {
    if (!themeMenuEl || !themeBtnEl) return;
    const willOpen = themeMenuEl.classList.contains('hidden');
    if (willOpen) {
        themeMenuEl.classList.remove('hidden');
        themeBtnEl.setAttribute('aria-expanded', 'true');
    } else {
        closeThemeMenu();
    }
}

export const ThemeManager = {
    current: localStorage.getItem('block_blast_theme') || 'dark',

    init() {
        this.setTheme(this.current);
        setThemeButtonLabel(this.current);

        if (themeBtnEl && themeMenuEl) {
            themeBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleThemeMenu();
            });

            themeMenuEl.addEventListener('click', (e) => {
                const item = e.target.closest('.theme-item');
                if (!item) return;
                const themeName = item.getAttribute('data-theme');
                if (!themeName) return;
                this.setTheme(themeName);
                closeThemeMenu();
            });

            // Dışarı tıklayınca kapat
            document.addEventListener('click', () => closeThemeMenu());
            // Escape ile kapat
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeThemeMenu();
            });
        }
    },

    setTheme(themeName) {
        this.current = themeName;
        localStorage.setItem('block_blast_theme', themeName);

        // Remove existing theme classes
        document.body.classList.remove('theme-dark', 'theme-neon', 'theme-wood', 'theme-candy', 'theme-cosmos', 'theme-retro', 'theme-seasons');

        // Add new theme class
        document.body.classList.add(`theme-${themeName}`);

        setThemeButtonLabel(themeName);

        // Re-align canvas size
        setTimeout(resizeCanvas, 50);
    }
};
