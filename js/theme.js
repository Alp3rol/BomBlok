import { themeBtnEl, themeMenuEl } from './state.js';
import { resizeCanvas } from './particles.js';
import { Storage, KEYS } from './storage.js';

// --- THEME MANAGER ---
export const THEME_LABELS = {
    dark: { icon: '🌙', name: 'Karanlık' },
    neon: { icon: '⚡', name: 'Neon' },
    wood: { icon: '🪵', name: 'Ahşap' },
    candy: { icon: '🍭', name: 'Şeker' },
    cosmos: { icon: '🌌', name: 'Uzay' },
    retro: { icon: '👾', name: 'Retro' },
    seasons: { icon: '🍂', name: 'Mevsimler' }
};

// İkon ve ad ayrı span'lara yazılıyor: dar ekranlarda CSS yalnızca adı gizleyip butonu
// ikon boyutuna indirebiliyor. Tek metin düğümüyle bu mümkün değildi ve başlık,
// kontroller yüzünden 320px'te tamamen kırpılıyordu.
function setThemeButtonLabel(themeName) {
    if (!themeBtnEl) return;
    const label = THEME_LABELS[themeName] || { icon: '', name: themeName };

    themeBtnEl.textContent = '';

    const icon = document.createElement('span');
    icon.className = 'theme-btn-icon';
    icon.textContent = label.icon;

    const name = document.createElement('span');
    name.className = 'theme-btn-name';
    name.textContent = label.name;

    themeBtnEl.append(icon, name);
    // Ad gizlendiğinde buton yalnızca emoji gösterdiği için erişilebilir ad şart.
    themeBtnEl.setAttribute('aria-label', `Tema: ${label.name}`);
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
    current: Storage.get(KEYS.theme, 'dark'),

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
        Storage.set(KEYS.theme, themeName);

        // Remove existing theme classes
        document.body.classList.remove('theme-dark', 'theme-neon', 'theme-wood', 'theme-candy', 'theme-cosmos', 'theme-retro', 'theme-seasons');

        // Add new theme class
        document.body.classList.add(`theme-${themeName}`);

        setThemeButtonLabel(themeName);

        // Re-align canvas size
        setTimeout(resizeCanvas, 50);
    }
};
