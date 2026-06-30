export const SHAPES = [
    // 1x1 Single
    { matrix: [[1]], color: 'orange' },

    // 2x1 & 1x2 Dominoes
    { matrix: [[1], [1]], color: 'blue' },
    { matrix: [[1, 1]], color: 'blue' },

    // 3x1 & 1x3 Triominoes
    { matrix: [[1], [1], [1]], color: 'green' },
    { matrix: [[1, 1, 1]], color: 'green' },

    // 4x1 & 1x4 Quadrominoes
    { matrix: [[1], [1], [1], [1]], color: 'purple' },
    { matrix: [[1, 1, 1, 1]], color: 'purple' },

    // 2x2 Square
    { matrix: [[1, 1], [1, 1]], color: 'yellow' },

    // 3x3 Square
    { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'pink' },

    // L-Shapes (Mini 2x2)
    { matrix: [[1, 0], [1, 1]], color: 'cyan' },
    { matrix: [[1, 1], [1, 0]], color: 'cyan' },
    { matrix: [[0, 1], [1, 1]], color: 'cyan' },
    { matrix: [[1, 1], [0, 1]], color: 'cyan' },

    // T-Shapes
    { matrix: [[1, 1, 1], [0, 1, 0]], color: 'purple' },
    { matrix: [[0, 1, 0], [1, 1, 1]], color: 'purple' }
];

export const PROGRESSION_RESET_VERSION = '2026-06-30-reset-1';

export function applyProgressResetIfNeeded() {
    const appliedVersion = localStorage.getItem('bomblok_progress_reset_version');
    if (appliedVersion === PROGRESSION_RESET_VERSION) return;

    [
        'bomblok_best',
        'block_blast_best',
        'bomblok_level',
        'bomblok_xp',
        'bomblok_jokers'
    ].forEach((key) => localStorage.removeItem(key));

    localStorage.setItem('bomblok_progress_reset_version', PROGRESSION_RESET_VERSION);
}

export function getDifficultyParams(level = 1) {
    const lvl = Math.max(1, level || 1);

    // Timebomb: seviye yükseldikçe daha sık ve daha kısa sayaç
    const timeBombChance = Math.min(0.25, 0.08 + (lvl - 1) * 0.01); // %8 -> %25
    const timerMin = Math.max(4, 8 - Math.floor((lvl - 1) / 4));
    const timerMax = Math.max(timerMin + 2, 12 - Math.floor((lvl - 1) / 3));

    // Timebomb'un oyuna giriş eşiği: seviye yükseldikçe daha erken başlasın
    const timeBombScoreThreshold = Math.max(150, 600 - (lvl - 1) * 40);

    // Başlangıç buz sayısı: seviye ile artar
    const initialIceMin = Math.min(10, 3 + Math.floor((lvl - 1) / 4));
    const initialIceMax = Math.min(12, 5 + Math.floor((lvl - 1) / 3));

    // Kolon kırımlarında ekstra buz (max 2)
    const iceSpawnMultiplier = Math.min(2, 1 + Math.floor((lvl - 1) / 8));

    return {
        lvl,
        timeBombChance,
        timerMin,
        timerMax,
        timeBombScoreThreshold,
        initialIceMin,
        initialIceMax,
        iceSpawnMultiplier
    };
}

export const COLOR_MAP = {
    orange: '#ff9f43',
    blue: '#00d2d3',
    green: '#1dd1a1',
    yellow: '#feca57',
    purple: '#a55eea',
    pink: '#ff9ff3',
    cyan: '#48dbfb',
    gold: '#ffd700',
    gray: '#9e9e9e'
};
