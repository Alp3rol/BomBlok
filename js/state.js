// Game State
export const state = {
    grid: Array(8).fill(null).map(() => Array(8).fill(0)), // 0 = empty, string (e.g., 'blue') = color of filled block
    timeBombs: [],
    score: 0,
    bestScore: parseInt(localStorage.getItem('bomblok_best') || localStorage.getItem('block_blast_best') || '0', 10),
    level: parseInt(localStorage.getItem('bomblok_level') || '1', 10),
    xp: parseInt(localStorage.getItem('bomblok_xp') || '0', 10),
    nickname: localStorage.getItem('bomblok_nickname') || '',
    dockedBlocks: [null, null, null], // Holds current shapes on dock
    isGameOver: false,
    comboCount: 0, // Track consecutive clears!
    rotationRights: 0, // Rotation rights per game!
    selectedBlockIndex: null, // Track selected block for click-to-place
    isFeverActive: false,
    feverTimeLeft: 0,
    feverIntervalId: null,
    jokers: parseInt(localStorage.getItem('bomblok_jokers'), 10) || 0,
    previousState: null,
    undoUsedThisGame: false,
    rerollUsedThisGame: false,
    // --- Gelişmiş Görev Takip Değişkenleri ---
    missionMoves: 0,
    movesSinceClear: 0,
    consecutiveClears: 0,
    usedRotationsInMission: 0,
    missionTimerId: null,
    missionTimeLeft: 0,
    // --- Active Drag State ---
    activeDrag: {
        blockEl: null,
        shape: null,
        slotIndex: null,
        initialLeft: 0,
        initialTop: 0,
        offsetX: 0,
        offsetY: 0
    }
};

// DOM Elements
export const gridBoard = document.getElementById('grid-board');
export const currentScoreEl = document.getElementById('current-score');
export const bestScoreEl = document.getElementById('best-score');
export const blockDock = document.getElementById('block-dock');
export const gameOverScreen = document.getElementById('game-over-screen');
export const finalScoreEl = document.getElementById('final-score');
export const restartBtn = document.getElementById('restart-btn');
export const soundBtn = document.getElementById('sound-btn');
export const themeDropdownEl = document.getElementById('theme-dropdown');
export const themeBtnEl = document.getElementById('theme-btn');
export const themeMenuEl = document.getElementById('theme-menu');
export const helpBtn = document.getElementById('help-btn');
export const helpModal = document.getElementById('help-modal');
export const helpCloseBtn = document.getElementById('help-close-btn');
export const modalStartBtn = document.getElementById('modal-start-btn');
export const feverBanner = document.getElementById('fever-banner');
export const feverBarFill = document.getElementById('fever-bar-fill');
export const playerLevelEl = document.getElementById('player-level');
export const xpBarFillEl = document.getElementById('xp-bar-fill');
export const xpTextEl = document.getElementById('xp-text');
export const leaderboardBtn = document.getElementById('leaderboard-btn');
export const leaderboardModal = document.getElementById('leaderboard-modal');
export const leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');
export const leaderboardStatusEl = document.getElementById('leaderboard-status');
export const leaderboardListEl = document.getElementById('leaderboard-list');
export const lbTabWeekly = document.getElementById('lb-tab-weekly');
export const lbTabGlobal = document.getElementById('lb-tab-global');
export const submitScoreBtn = document.getElementById('submit-score-btn');
export const nicknamePanelEl = document.getElementById('nickname-panel');
export const nicknameInputEl = document.getElementById('nickname-input');
export const nicknameSaveBtnEl = document.getElementById('nickname-save-btn');
export const nicknameHintEl = document.getElementById('nickname-hint');
export const gameOverSaveStatusEl = document.getElementById('game-over-save-status');
export const gameOverNicknameInputEl = document.getElementById('game-over-nickname-input');
export const gameOverSaveBtnEl = document.getElementById('game-over-save-btn');
export const gameOverNicknameHintEl = document.getElementById('game-over-nickname-hint');

// --- iOS VIEWPORT HEIGHT FIX ---
export function syncAppVh() {
    const h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-vh', `${h * 0.01}px`);
}
syncAppVh();
window.addEventListener('resize', syncAppVh);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppVh);
    window.visualViewport.addEventListener('scroll', syncAppVh);
}
