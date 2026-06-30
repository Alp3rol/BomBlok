// --- BOMBLOK: APP STATE & INITIALIZATION ---

// Shapes Database
const SHAPES = [
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

const TIME_BOMB_SCORE_THRESHOLD = 0; // TODO: İleride 1000'e çekilecek

// --- ZORLUK EĞRİSİ (DIFFICULTY CURVE) ---
function getDifficultyParams() {
    const lvl = Math.max(1, state.level || 1);

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

// Game State
const state = {
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
    missionTimeLeft: 0
};

// DOM Elements
const gridBoard = document.getElementById('grid-board');
const currentScoreEl = document.getElementById('current-score');
const bestScoreEl = document.getElementById('best-score');
const blockDock = document.getElementById('block-dock');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const soundBtn = document.getElementById('sound-btn');
const themeSelectEl = document.getElementById('theme-select');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const helpCloseBtn = document.getElementById('help-close-btn');
const modalStartBtn = document.getElementById('modal-start-btn');
const feverBanner = document.getElementById('fever-banner');
const feverBarFill = document.getElementById('fever-bar-fill');
const playerLevelEl = document.getElementById('player-level');
const xpBarFillEl = document.getElementById('xp-bar-fill');
const xpTextEl = document.getElementById('xp-text');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');
const leaderboardStatusEl = document.getElementById('leaderboard-status');
const leaderboardListEl = document.getElementById('leaderboard-list');
const lbTabWeekly = document.getElementById('lb-tab-weekly');
const lbTabGlobal = document.getElementById('lb-tab-global');
const submitScoreBtn = document.getElementById('submit-score-btn');

// --- THEME MANAGER ---
const ThemeManager = {
    current: localStorage.getItem('block_blast_theme') || 'dark',

    init() {
        this.setTheme(this.current);
        if (themeSelectEl) {
            themeSelectEl.value = this.current;
            themeSelectEl.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
    },

    setTheme(themeName) {
        this.current = themeName;
        localStorage.setItem('block_blast_theme', themeName);

        // Remove existing theme classes
        document.body.classList.remove('theme-dark', 'theme-neon', 'theme-wood', 'theme-candy', 'theme-cosmos', 'theme-retro');

        // Add new theme class
        document.body.classList.add(`theme-${themeName}`);

        // Re-align canvas size
        setTimeout(resizeCanvas, 50);
    }
};

// --- WEB AUDIO API: SYNTHESIZED SOUND EFFECTS ---
const AudioFX = {
    ctx: null,
    muted: localStorage.getItem('block_blast_muted') === 'true',

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('block_blast_muted', this.muted);
        this.updateButtonUI();
        if (this.muted) {
            this.stopBgMusic();
        } else {
            this.startBgMusic();
        }
        return this.muted;
    },

    updateButtonUI() {
        if (!soundBtn) return;
        if (this.muted) {
            soundBtn.textContent = '🔇';
            soundBtn.classList.add('muted');
        } else {
            soundBtn.textContent = '🔊';
            soundBtn.classList.remove('muted');
        }
    },

    play(setupFn) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        setupFn(this.ctx);
    },

    playDrop() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const duration = 0.06; // very short decay

            // Fundamental sine (soft & warm)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(350, now);
            osc1.frequency.exponentialRampToValueAtTime(120, now + duration);
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc1.start(now);
            osc1.stop(now + duration);

            // Quiet wood block overtone
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(700, now);
            osc2.frequency.exponentialRampToValueAtTime(240, now + duration);
            gain2.gain.setValueAtTime(0.06, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc2.start(now);
            osc2.stop(now + duration);
        });
    },

    playGrab() {
        this.play((ctx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // A soft, low-frequency 30ms pop
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);

            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.03);
        });
    },

    playRotate() {
        this.play((ctx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Soft sine sweep
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        });
    },

    playClear(comboCount = 1) {
        this.play((ctx) => {
            const now = ctx.currentTime;
            // Warm pentatonic notes
            const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
            const baseIndex = Math.min(comboCount - 1, notes.length - 2);

            const f1 = notes[baseIndex];
            const f2 = notes[baseIndex + 1];

            // Soft lowpass filter to remove any high-frequency transients/clicks
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(750, now);
            filter.connect(ctx.destination);

            const duration = 0.12; // very short decay

            [f1, f2].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(filter);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.03);

                gain.gain.setValueAtTime(0.18, now + idx * 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + duration);

                osc.start(now + idx * 0.03);
                osc.stop(now + idx * 0.03 + duration);
            });
        });
    },

    playCrossClear() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            // Beautiful warm Cmaj9 chord (C4, E4, G4, B4, D5)
            const notes = [261.63, 329.63, 392.00, 493.88, 587.33];

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            filter.connect(ctx.destination);

            const duration = 0.18;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(filter);

                osc.type = 'sine';
                // Strummed offset
                osc.frequency.setValueAtTime(freq, now + idx * 0.025);

                gain.gain.setValueAtTime(0.12, now + idx * 0.025);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + duration);

                osc.start(now + idx * 0.025);
                osc.stop(now + idx * 0.025 + duration);
            });
        });
    },

    playBomb() {
        this.play((ctx) => {
            const now = ctx.currentTime;

            // Create a lowpass filter to make the boom soft, warm, and low-frequency
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(250, now); // Low cutoff removes all high noise crackle
            filter.frequency.exponentialRampToValueAtTime(70, now + 0.35);
            filter.Q.setValueAtTime(1.0, now);
            filter.connect(ctx.destination);

            // 1. Deep sine wave boom
            const osc = ctx.createOscillator();
            const gainOsc = ctx.createGain();
            osc.connect(gainOsc);
            gainOsc.connect(filter);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

            gainOsc.gain.setValueAtTime(0.45, now);
            gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);

            // 2. Soft white noise explosion puff
            const bufferSize = ctx.sampleRate * 0.25; // 0.25s duration
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const gainNoise = ctx.createGain();
            noise.connect(gainNoise);
            gainNoise.connect(filter);

            gainNoise.gain.setValueAtTime(0.18, now);
            gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noise.start(now);
            noise.stop(now + 0.25);
        });
    },

    playGameOver() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const notes = [300, 250, 200, 150];
            const duration = 0.2;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);

                gain.gain.setValueAtTime(0.1, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + duration);

                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + duration);
            });
        });
    },

    playBuzzer() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Soft deep thud
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

            osc.start(now);
            osc.stop(now + 0.12);
        });
    },

    playMissionComplete() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            // Rising major arpeggio (C4 -> E4 -> G4 -> C5 -> E5 -> G5)
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
            const duration = 0.15;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                gain.gain.setValueAtTime(0.08, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + duration);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + duration);
            });
        });
    },

    bgMusicInterval: null,
    bgMusicStep: 0,
    bgMusicTempo: 500, // ms per beat

    startBgMusic() {
        if (this.muted) return;
        if (this.bgMusicInterval) return;
        this.init();
        if (!this.ctx) return;

        this.bgMusicStep = 0;
        this.bgMusicInterval = setInterval(() => {
            this.playBeat();
        }, this.bgMusicTempo);
    },

    stopBgMusic() {
        if (this.bgMusicInterval) {
            clearInterval(this.bgMusicInterval);
            this.bgMusicInterval = null;
        }
    },

    setBgMusicTempo(tempo) {
        if (this.bgMusicTempo === tempo) return;
        this.bgMusicTempo = tempo;
        if (this.bgMusicInterval) {
            this.stopBgMusic();
            this.startBgMusic();
        }
    },

    playBeat() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Rhythmic low synth beat
            osc.type = 'triangle';
            
            // Simple retro bass melody: C2, E2, G2, A2
            const notes = [65.41, 82.41, 98.00, 110.00]; 
            const note = notes[this.bgMusicStep % notes.length];
            this.bgMusicStep++;

            const isFeverActive = state && state.isFeverActive;
            const frequency = isFeverActive ? note * 1.5 : note;

            osc.frequency.setValueAtTime(frequency, now);

            gain.gain.setValueAtTime(isFeverActive ? 0.04 : 0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.start(now);
            osc.stop(now + 0.15);
        });
    },

    playUndo() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    },

    playReroll() {
        this.play((ctx) => {
            const now = ctx.currentTime;
            const notes = [300, 400, 500, 700];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now + i * 0.06);
                gain.gain.setValueAtTime(0.06, now + i * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.08);
                osc.start(now + i * 0.06);
                osc.stop(now + i * 0.06 + 0.08);
            });
        });
    }
};

// Warm up Web Audio API on first user interaction
window.addEventListener('pointerdown', () => {
    AudioFX.init();
    AudioFX.startBgMusic();
}, { once: true });
if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        AudioFX.toggleMute();
        AudioFX.init();
    });
    AudioFX.updateButtonUI(); // Sync button on load
}

// --- CANVAS-BASED NEON PARTICLE SYSTEM ---
const canvas = document.getElementById('effects-canvas');
const ctx = canvas.getContext('2d');

const COLOR_MAP = {
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

let particles = [];
let isLoopRunning = false;

class Particle {
    constructor(x, y, colorName) {
        this.x = x;
        this.y = y;
        const isWood = document.body.classList.contains('theme-wood');
        const isCandy = document.body.classList.contains('theme-candy');
        const isNeon = document.body.classList.contains('theme-neon');
        const isRetro = document.body.classList.contains('theme-retro');
        const isCosmos = document.body.classList.contains('theme-cosmos');
        
        let baseColor = COLOR_MAP[colorName] || '#ff007f';

        if (isWood) {
            this.type = 'wood-splinter';
            const woodColors = ['#8d6e63', '#6d4c41', '#5d4037', '#795548', '#a1887f'];
            this.color = woodColors[Math.floor(Math.random() * woodColors.length)];
            this.radius = 4.0 + Math.random() * 6.0;
            this.gravity = 0.15 + Math.random() * 0.15;
        } else if (isCandy) {
            this.type = Math.random() < 0.5 ? 'confetti' : 'circle';
            this.color = baseColor;
            this.radius = 4.0 + Math.random() * 5.0;
            this.gravity = 0.08 + Math.random() * 0.1;
        } else if (isNeon) {
            this.type = 'glitch';
            const neonColors = [baseColor, '#00ffff', '#ff00ff', '#ffffff'];
            this.color = neonColors[Math.floor(Math.random() * neonColors.length)];
            this.radius = 1.0 + Math.random() * 3.0;
            this.gravity = 0.02 + Math.random() * 0.05;
        } else if (isRetro) {
            this.type = 'pixel';
            this.color = baseColor;
            this.radius = 4.0 + Math.random() * 4.0;
            this.gravity = 0.1 + Math.random() * 0.1;
        } else if (isCosmos) {
            this.type = 'stardust';
            const cosmosColors = [baseColor, '#8a2be2', '#00ffff', '#ffffff'];
            this.color = cosmosColors[Math.floor(Math.random() * cosmosColors.length)];
            this.radius = 1.0 + Math.random() * 2.0;
            this.gravity = 0; // Float around
        } else {
            this.color = baseColor;
            this.type = Math.random() < 0.35 ? 'sparkle' : (Math.random() < 0.45 ? 'diamond' : 'circle');
            this.radius = 2.0 + Math.random() * 3.0;
            this.gravity = 0.05 + Math.random() * 0.05;
        }
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.0 + Math.random() * 5.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1.0;
        this.decay = 0.015 + Math.random() * 0.015;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; // Apply gravity
        this.vx *= 0.94; // Friction
        this.vy *= 0.94;
        this.rotation += this.rotationSpeed;
        this.alpha -= this.decay;
    }

    draw(c) {
        c.save();
        c.globalAlpha = Math.max(0, this.alpha);
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.fillStyle = this.color;

        if (this.type === 'wood-splinter') {
            c.shadowBlur = 3;
            c.shadowColor = 'rgba(0,0,0,0.5)';
            c.fillRect(-this.radius, -this.radius * 0.25, this.radius * 2, this.radius * 0.5);
            c.strokeStyle = 'rgba(0,0,0,0.4)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(-this.radius * 0.8, 0);
            c.lineTo(this.radius * 0.8, 0);
            c.stroke();
        } else if (this.type === 'confetti') {
            c.shadowBlur = 5;
            c.shadowColor = this.color;
            c.fillRect(-this.radius, -this.radius*0.5, this.radius*2, this.radius);
        } else if (this.type === 'pixel') {
            c.shadowBlur = 0;
            c.rotate(-this.rotation); // Undo rotation to keep squares axis-aligned
            c.fillRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        } else if (this.type === 'glitch') {
            c.shadowBlur = 10;
            c.shadowColor = this.color;
            c.globalCompositeOperation = 'screen';
            c.fillRect(-this.radius*2, -this.radius*0.2, this.radius*4, this.radius*0.4);
        } else if (this.type === 'stardust') {
            c.shadowBlur = 15;
            c.shadowColor = this.color;
            c.beginPath();
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
            c.fill();
        } else {
            c.shadowBlur = 10;
            c.shadowColor = this.color;
            if (this.type === 'sparkle') {
                // Draw a beautiful 4-point magic sparkle star
                c.beginPath();
                for (let i = 0; i < 4; i++) {
                    c.lineTo(this.radius * 2.2, 0);
                    c.lineTo(this.radius * 0.4, this.radius * 0.4);
                    c.rotate(Math.PI / 2);
                }
                c.closePath();
                c.fill();
            } else if (this.type === 'diamond') {
            // Draw a shiny diamond
            c.beginPath();
            c.moveTo(0, -this.radius * 1.4);
            c.lineTo(this.radius * 1.4, 0);
            c.lineTo(0, this.radius * 1.4);
            c.lineTo(-this.radius * 1.4, 0);
            c.closePath();
            c.fill();
        } else {
            // Draw a neon sphere
            c.beginPath();
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
            c.fill();
        }
        }

        c.restore();
    }
}

function resizeCanvas() {
    if (!canvas || !gridBoard) return;
    const rect = gridBoard.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function spawnParticles(gridR, gridC, colorName) {
    const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${gridR}"][data-col="${gridC}"]`);
    if (!cellEl) return;

    const cellRect = cellEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const startX = cellRect.left - canvasRect.left + cellRect.width / 2;
    const startY = cellRect.top - canvasRect.top + cellRect.height / 2;

    // Spawn 15 particles per cell
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(startX, startY, colorName));
    }

    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(particleTick);
    }
}

// İstemci (viewport) koordinatlarına göre partikül patlaması (UI butonları vb. için)
function spawnParticlesAtScreen(clientX, clientY, colorName) {
    if (!canvas || !ctx) return;
    const canvasRect = canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    if (x < 0 || y < 0 || x > canvasRect.width || y > canvasRect.height) return;

    for (let i = 0; i < 25; i++) {
        particles.push(new Particle(x, y, colorName));
    }
    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(particleTick);
    }
}

function particleTick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);

        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    if (particles.length > 0) {
        requestAnimationFrame(particleTick);
    } else {
        isLoopRunning = false;
    }
}

window.addEventListener('resize', resizeCanvas);

// Spawn random ice block obstacles on the board
function spawnIceBlocks() {
    const diff = getDifficultyParams();
    const iceCount = diff.initialIceMin + Math.floor(Math.random() * (diff.initialIceMax - diff.initialIceMin + 1));
    let remaining = iceCount;
    while (remaining > 0) {
        const r = Math.floor(Math.random() * 8);
        const c = Math.floor(Math.random() * 8);
        if (state.grid[r][c] === 0) {
            state.grid[r][c] = 'ice';
            remaining--;
        }
    }
}

// Initialize Grid Board HTML
let dragRAF = null;
let currentDragX = 0;
let currentDragY = 0;

function initGrid() {
    gridBoard.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            const cellState = state.grid[r][c];
            if (cellState !== 0) {
                if (cellState === 'ice') {
                    cell.classList.add('filled', 'filled-ice');
                } else if (cellState === 'timebomb') {
                    cell.classList.add('filled', 'filled-timebomb');
                    const tb = state.timeBombs.find(b => b.r === r && b.c === c);
                    if (tb) cell.dataset.timer = tb.timer;
                } else if (cellState === 'stone') {
                    cell.classList.add('filled', 'filled-stone');
                } else if (typeof cellState === 'string' && cellState.endsWith('-bomb')) {
                    const color = cellState.split('-')[0];
                    cell.classList.add('filled', `filled-${color}`, 'bomb');
                } else {
                    cell.classList.add('filled', `filled-${cellState}`);
                }
            }

            // Pointer event listeners for click-to-place
            cell.addEventListener('pointerenter', () => {
                if (state.selectedBlockIndex !== null) {
                    showPreviewForSelectedBlock(r, c);
                }
            });

            cell.addEventListener('pointerleave', () => {
                if (state.selectedBlockIndex !== null) {
                    clearGridHighlights();
                }
            });

            cell.addEventListener('click', () => {
                if (state.selectedBlockIndex !== null) {
                    tryPlaceSelectedBlock(r, c);
                }
            });

            gridBoard.appendChild(cell);
        }
    }
    updateScoreUI();
}

// Generate 3 random shapes and place them in the dock
function generateDockBlocks() {
    state.dockedBlocks = [];
    const slots = document.querySelectorAll('.dock-slot');

    slots.forEach((slot, index) => {
        slot.innerHTML = '';

        // Pick a random shape from SHAPES
        let randomShapeIndex = Math.floor(Math.random() * SHAPES.length);
        let shape = JSON.parse(JSON.stringify(SHAPES[randomShapeIndex]));

        // Reduce 1x1 single block frequency by redrawing 95% of the time
        if (shape.matrix.length === 1 && shape.matrix[0].length === 1) {
            if (Math.random() < 0.95) {
                const nonSingleShapes = SHAPES.filter(s => !(s.matrix.length === 1 && s.matrix[0].length === 1));
                const newRandomIndex = Math.floor(Math.random() * nonSingleShapes.length);
                shape = JSON.parse(JSON.stringify(nonSingleShapes[newRandomIndex]));
            }
        }

        // 25% chance to contain a bomb cell
        if (Math.random() < 0.25) {
            const solidCells = [];
            const matrix = shape.matrix;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] === 1) {
                        solidCells.push({ r, c });
                    }
                }
            }
            if (solidCells.length > 0) {
                const randCell = solidCells[Math.floor(Math.random() * solidCells.length)];
                shape.bombCell = randCell;
            }
        }

        state.dockedBlocks[index] = shape;

        // Render block shape
        renderBlockInSlot(shape, slot, index);
    });
}

// Helper to render block matrix as HTML elements inside a dock slot
function renderBlockInSlot(shape, slot, index) {
    const matrix = shape.matrix;
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Create the container element for the shape
    const blockEl = document.createElement('div');
    blockEl.classList.add('block-shape', 'in-dock', shape.color);
    blockEl.dataset.slotIndex = index;

    // Grid styles based on dimensions
    blockEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    blockEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Fixed cell size for uniform look — max 4 cells = 4*22 + 3*2 = 94px, fits in dock
    const cellSize = 22;
    const gap = 2;
    blockEl.style.width = `${cols * cellSize + (cols - 1) * gap}px`;
    blockEl.style.height = `${rows * cellSize + (rows - 1) * gap}px`;
    blockEl.style.display = 'grid';
    blockEl.style.gap = `${gap}px`;

    // Build cells
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellEl = document.createElement('div');
            cellEl.classList.add('block-cell');

            if (matrix[r][c] === 1) {
                cellEl.style.visibility = 'visible';
                // Mark cell with bomb class if it is a bomb
                if (shape.bombCell && shape.bombCell.r === r && shape.bombCell.c === c) {
                    cellEl.classList.add('bomb');
                }
            } else {
                cellEl.style.visibility = 'hidden';
            }
            blockEl.appendChild(cellEl);
        }
    }

    slot.appendChild(blockEl);
}

// --- DRAG & DROP MECHANICS ---

let activeDrag = {
    blockEl: null,
    shape: null,
    slotIndex: null,
    pointerId: null,
    dragOffset: { x: 0, y: 0 },
    gridCellSize: 0,
    gap: 6,
    validPlacement: false,
    targetCells: [],
    originalSlot: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    offsetR: null,
    offsetC: null,
    isDragging: false
};

function onPointerDown(e, blockEl, shape, slotIndex) {
    if (state.isGameOver) return;
    e.preventDefault();

    activeDrag.blockEl = blockEl;
    activeDrag.shape = shape;
    activeDrag.slotIndex = slotIndex;
    activeDrag.pointerId = e.pointerId;
    activeDrag.originalSlot = blockEl.parentElement;
    activeDrag.startX = e.clientX;
    activeDrag.startY = e.clientY;
    activeDrag.startTime = Date.now();
    activeDrag.isDragging = false;

    const firstGridCell = gridBoard.querySelector('.grid-cell');
    activeDrag.gridCellSize = firstGridCell.getBoundingClientRect().width;
    activeDrag.gap = 6;

    // Use window for events to prevent loss of tracking during DOM manipulation
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
    if (!activeDrag.blockEl || e.pointerId !== activeDrag.pointerId) return;
    const blockEl = activeDrag.blockEl;

    if (!activeDrag.isDragging) {
        const moveDist = Math.hypot(e.clientX - activeDrag.startX, e.clientY - activeDrag.startY);
        if (moveDist > 8) {
            activeDrag.isDragging = true;
            AudioFX.playGrab();
            
            const shape = activeDrag.shape;
            const cols = shape.matrix[0].length;
            const rows = shape.matrix.length;
            const targetWidth = cols * activeDrag.gridCellSize + (cols - 1) * activeDrag.gap;
            const targetHeight = rows * activeDrag.gridCellSize + (rows - 1) * activeDrag.gap;

            activeDrag.dragOffset = {
                x: targetWidth / 2,
                y: targetHeight / 2
            };

            blockEl.classList.remove('in-dock');
            blockEl.classList.add('dragging');

            document.body.appendChild(blockEl);
            blockEl.style.position = 'fixed';
            blockEl.style.width = `${targetWidth}px`;
            blockEl.style.height = `${targetHeight}px`;
            blockEl.style.gap = `${activeDrag.gap}px`;
            blockEl.style.left = '0px';
            blockEl.style.top = '0px';

            let startYOffset = 0;
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                startYOffset = -80;
            }
            const initX = e.clientX - activeDrag.dragOffset.x;
            const initY = e.clientY - activeDrag.dragOffset.y + startYOffset;

            // Compute initial transform so the block instantly snaps under the pointer
            blockEl.style.transform = `translate3d(${initX}px, ${initY}px, 0)`;
            blockEl.style.willChange = 'transform';
        } else {
            return;
        }
    }

    if (activeDrag.isDragging) {
        let yOffset = 0;
        // Eğer dokunmatik ekran ise, blok parmağın altında kalmasın diye "Fat Finger" offset'i uyguluyoruz (-80px)
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            yOffset = -80;
        }

        currentDragX = e.clientX - activeDrag.dragOffset.x;
        currentDragY = e.clientY - activeDrag.dragOffset.y + yOffset;

        if (!dragRAF) {
            dragRAF = requestAnimationFrame(() => {
                if (activeDrag.isDragging && activeDrag.blockEl) {
                    activeDrag.blockEl.style.transform = `translate3d(${currentDragX}px, ${currentDragY}px, 0)`;
                    checkPlacementValidity();
                }
                dragRAF = null;
            });
        }
    }
}

function checkPlacementValidity() {
    const { blockEl, shape, gridCellSize, gap } = activeDrag;
    if (!blockEl) return;

    const blockRect = blockEl.getBoundingClientRect();
    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;

    let offsetR = null;
    let offsetC = null;

    // Reset previous highlights
    clearGridHighlights();
    activeDrag.targetCells = [];
    activeDrag.validPlacement = false;

    // 1. Locate the grid cell under the first solid cell of the shape to establish the grid offset
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                // Approximate screen position of this cell's center
                // Remember that translatey(-40px) is applied via CSS, so we read the actual visual rect
                const cellCenterX = blockRect.left + (c + 0.5) * (gridCellSize + gap);
                const cellCenterY = blockRect.top + (r + 0.5) * (gridCellSize + gap);

                // Temporarily hide dragged block to find grid cell underneath
                blockEl.style.pointerEvents = 'none';
                const el = document.elementFromPoint(cellCenterX, cellCenterY);
                blockEl.style.pointerEvents = '';

                if (el && el.classList.contains('grid-cell')) {
                    const gridR = parseInt(el.dataset.row, 10);
                    const gridC = parseInt(el.dataset.col, 10);

                    offsetR = gridR - r;
                    offsetC = gridC - c;
                    break;
                }
            }
        }
        if (offsetR !== null) break;
    }

    // 2. Validate / preview placement if we found a valid grid offset
    if (offsetR !== null && offsetC !== null) {
        let fits = true;
        const proposedCells = [];
        const invalidCells = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape.matrix[r][c] === 1) {
                    const targetR = offsetR + r;
                    const targetC = offsetC + c;

                    // Out of bounds
                    if (targetR < 0 || targetR >= 8 || targetC < 0 || targetC >= 8) {
                        fits = false;
                        break;
                    }

                    const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${targetR}"][data-col="${targetC}"]`);
                    const isOccupied = state.grid[targetR][targetC] !== 0;
                    if (isOccupied) {
                        fits = false;
                        invalidCells.push({ r: targetR, c: targetC, el: cellEl });
                    } else {
                        proposedCells.push({ r: targetR, c: targetC, el: cellEl });
                    }
                }
            }
            if (!fits && invalidCells.length === 0) break;
        }

        if (fits) {
            activeDrag.validPlacement = true;
            activeDrag.targetCells = proposedCells;
            activeDrag.offsetR = offsetR;
            activeDrag.offsetC = offsetC;

            // Apply highlight class to candidate grid cells
            proposedCells.forEach(cell => {
                cell.el.classList.add('highlight-valid');
            });
        } else {
            // Daha iyi preview: kısmen geçerli hücreleri yeşil, dolu olanları kırmızı göster
            proposedCells.forEach(cell => {
                if (cell.el) cell.el.classList.add('highlight-valid');
            });
            invalidCells.forEach(cell => {
                if (cell.el) cell.el.classList.add('highlight-invalid');
            });
        }
    }
}

function clearGridHighlights() {
    const cells = gridBoard.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.classList.remove('highlight-valid', 'highlight-invalid');
    });
}

function selectBlock(slotIndex) {
    deselectBlock();
    state.selectedBlockIndex = slotIndex;
    const blockEl = blockDock.querySelector(`.block-shape[data-slot-index="${slotIndex}"]`);
    if (blockEl) {
        blockEl.classList.add('selected');
    }
}

function deselectBlock() {
    state.selectedBlockIndex = null;
    const selectedBlocks = blockDock.querySelectorAll('.block-shape.selected');
    selectedBlocks.forEach(b => b.classList.remove('selected'));
    clearGridHighlights();
}

function showPreviewForSelectedBlock(gridR, gridC) {
    clearGridHighlights();
    if (state.selectedBlockIndex === null || state.isGameOver) return;
    const shape = state.dockedBlocks[state.selectedBlockIndex];
    if (!shape) return;

    let anchorR = null, anchorC = null;
    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                anchorR = r;
                anchorC = c;
                break;
            }
        }
        if (anchorR !== null) break;
    }

    const offsetR = gridR - anchorR;
    const offsetC = gridC - anchorC;

    let fits = true;
    const proposedCells = [];
    const invalidCells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                const targetR = offsetR + r;
                const targetC = offsetC + c;
                if (targetR < 0 || targetR >= 8 || targetC < 0 || targetC >= 8) {
                    fits = false;
                    break;
                }
                const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${targetR}"][data-col="${targetC}"]`);
                if (state.grid[targetR][targetC] !== 0) {
                    fits = false;
                    invalidCells.push(cellEl);
                } else {
                    proposedCells.push(cellEl);
                }
            }
        }
        if (!fits) break;
    }

    if (fits) {
        proposedCells.forEach(el => {
            if (el) el.classList.add('highlight-valid');
        });
    } else {
        proposedCells.forEach(el => {
            if (el) el.classList.add('highlight-valid');
        });
        invalidCells.forEach(el => {
            if (el) el.classList.add('highlight-invalid');
        });
    }
}

function tryPlaceSelectedBlock(gridR, gridC) {
    if (state.selectedBlockIndex === null || state.isGameOver) return;
    const shape = state.dockedBlocks[state.selectedBlockIndex];
    if (!shape) return;

    let anchorR = null, anchorC = null;
    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                anchorR = r;
                anchorC = c;
                break;
            }
        }
        if (anchorR !== null) break;
    }

    const offsetR = gridR - anchorR;
    const offsetC = gridC - anchorC;

    let fits = true;
    const proposedCells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                const targetR = offsetR + r;
                const targetC = offsetC + c;
                if (targetR < 0 || targetR >= 8 || targetC < 0 || targetC >= 8 || state.grid[targetR][targetC] !== 0) {
                    fits = false;
                    break;
                }
                const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${targetR}"][data-col="${targetC}"]`);
                proposedCells.push({ r: targetR, c: targetC, el: cellEl });
            }
        }
        if (!fits) break;
    }

    if (fits) {
        // Save state snapshot before placement for Undo
        saveStateSnapshot();
        proposedCells.forEach(cell => {
            const relativeR = cell.r - offsetR;
            const relativeC = cell.c - offsetC;
            const isBomb = shape.bombCell && shape.bombCell.r === relativeR && shape.bombCell.c === relativeC;
            const cellColor = isBomb ? `${shape.color}-bomb` : shape.color;
            state.grid[cell.r][cell.c] = cellColor;

            cell.el.classList.add('filled', `filled-${shape.color}`);
            if (isBomb) {
                cell.el.classList.add('bomb');
            }
        });

        let shapeScore = proposedCells.length;
        if (state.isFeverActive) {
            shapeScore *= 2;
        }
        state.score += shapeScore;
        updateMissionProgress('points', shapeScore);
        updateMissionProgress('blocks', 1);
        updateScoreUI();

        const blockEl = blockDock.querySelector(`.block-shape[data-slot-index="${state.selectedBlockIndex}"]`);
        if (blockEl) blockEl.remove();
        state.dockedBlocks[state.selectedBlockIndex] = null;

        AudioFX.playDrop();
        deselectBlock();
        checkAndClearLines();

        const isDockEmpty = state.dockedBlocks.every(block => block === null);
        if (isDockEmpty) {
            generateDockBlocks();
        }
        updateJokerButtonsUI();
    } else {
        AudioFX.playBuzzer();
    }
}

function onPointerUp(e) {
    if (!activeDrag.blockEl || e.pointerId !== activeDrag.pointerId) return;

    const { blockEl, shape, slotIndex, validPlacement, targetCells, originalSlot, isDragging } = activeDrag;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    clearGridHighlights();

    if (!isDragging) {
        if (state.rotationRights > 0) {
            state.rotationRights--;
            state.usedRotationsInMission++;
            updateScoreUI();
            AudioFX.playRotate();

            const rCount = shape.matrix.length;
            shape.matrix = getRotatedMatrix(shape.matrix);

            if (shape.bombCell) {
                const oldR = shape.bombCell.r;
                const oldC = shape.bombCell.c;
                shape.bombCell.r = oldC;
                shape.bombCell.c = rCount - 1 - oldR;
            }

            state.dockedBlocks[slotIndex] = shape;

            if (originalSlot) {
                blockEl.style.transition = 'transform 0.2s ease-in-out';
                blockEl.style.transform = 'rotate(90deg)';
                
                setTimeout(() => {
                    originalSlot.innerHTML = '';
                    renderBlockInSlot(shape, originalSlot, slotIndex);
                }, 200);
            }
        } else {
            if (state.jokers > 0) {
                state.jokers--;
                localStorage.setItem('bomblok_jokers', state.jokers);
                state.rotationRights += 1;
                updateJokerButtonsUI();
                AudioFX.playReroll();
                
                state.rotationRights--;
                state.usedRotationsInMission++;
                updateScoreUI();
                AudioFX.playRotate();
                
                const rCount = shape.matrix.length;
                shape.matrix = getRotatedMatrix(shape.matrix);
                if (shape.bombCell) {
                    const oldR = shape.bombCell.r;
                    const oldC = shape.bombCell.c;
                    shape.bombCell.r = oldC;
                    shape.bombCell.c = rCount - 1 - oldR;
                }
                state.dockedBlocks[slotIndex] = shape;
                
                if (originalSlot) {
                    blockEl.style.transition = 'transform 0.2s ease-in-out';
                    blockEl.style.transform = `translate3d(${currentDragX}px, ${currentDragY}px, 0) rotate(90deg)`;
                    setTimeout(() => {
                        originalSlot.innerHTML = '';
                        renderBlockInSlot(shape, originalSlot, slotIndex);
                    }, 200);
                }
            } else {
                // Döndürme hakkı yoksa: bloğu seç (tıkla-yerleştir akışını kullanabilsin)
                try { AudioFX.playGrab(); } catch (err) {}
                selectBlock(slotIndex);
            }
        }
    } else {
        if (validPlacement && targetCells.length > 0) {
            AudioFX.playDrop();
            saveStateSnapshot();
            
            targetCells.forEach(cell => {
                const relativeR = cell.r - activeDrag.offsetR;
                const relativeC = cell.c - activeDrag.offsetC;
                const isBomb = shape.bombCell && shape.bombCell.r === relativeR && shape.bombCell.c === relativeC;
                const cellColor = isBomb ? `${shape.color}-bomb` : shape.color;

                state.grid[cell.r][cell.c] = cellColor;

                cell.el.classList.add('filled', `filled-${shape.color}`);
                if (isBomb) {
                    cell.el.classList.add('bomb');
                }
            });

            // Add score (1 point per filled cell)
            let shapeScore = targetCells.length;
            if (state.isFeverActive) {
                shapeScore *= 2;
            }
            state.score += shapeScore;
            updateMissionProgress('points', shapeScore);
            updateMissionProgress('blocks', 1);
            updateScoreUI();
        addXp(shapeScore);
            addXp(shapeScore);

            blockEl.remove();
            state.dockedBlocks[slotIndex] = null;
            checkAndClearLines();
            
            const isDockEmpty = state.dockedBlocks.every(b => b === null);
            if (isDockEmpty) generateDockBlocks();
            updateJokerButtonsUI();
        } else {
            AudioFX.playBuzzer();
            blockEl.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            const rect = originalSlot.getBoundingClientRect();
            blockEl.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1)`;

            setTimeout(() => {
                blockEl.remove();
                if (originalSlot) {
                    originalSlot.innerHTML = '';
                    renderBlockInSlot(shape, originalSlot, slotIndex);
                }
            }, 200);
        }
    }

    activeDrag = {
        blockEl: null, shape: null, slotIndex: null, pointerId: null,
        dragOffset: { x: 0, y: 0 }, gridCellSize: 0, gap: 6,
        validPlacement: false, targetCells: [], originalSlot: null,
        startX: 0, startY: 0, startTime: 0, offsetR: null, offsetC: null, isDragging: false
    };
}

// --- GÖREV / HEDEF SİSTEMİ (MISSION SYSTEM) ---
const MISSION_POOL = [
    { type: 'lines', text: 'Satır/Sütun Temizle', target: () => Math.floor(Math.random() * 8) + 5, icon: '📏' }, // 5-12
    { type: 'ice', text: 'Buz Kır', target: () => Math.floor(Math.random() * 5) + 4, icon: '❄️' }, // 4-8
    { type: 'bombs', text: 'Bomba Patlat', target: () => Math.floor(Math.random() * 4) + 2, icon: '💣' }, // 2-5
    { type: 'points', text: 'Puan Topla', target: () => (Math.floor(Math.random() * 6) + 3) * 100, icon: '💯' }, // 300-800
    { type: 'combo', text: '3\'lü Kombo Yap', target: () => Math.floor(Math.random() * 2) + 1, icon: '🔥' }, // 1-2
    { type: 'multiclear', text: 'Çoklu Kırım (2+)', target: () => Math.floor(Math.random() * 3) + 2, icon: '⚡' }, // 2-4
    { type: 'fever', text: 'Fever Modunu Başlat', target: () => Math.floor(Math.random() * 2) + 1, icon: '🌟' }, // 1-2
    { type: 'blocks', text: 'Blok Yerleştir', target: () => (Math.floor(Math.random() * 5) + 2) * 10, icon: '🧱' }, // 20-60
    { type: 'rotate', text: 'Blok Döndür', target: () => Math.floor(Math.random() * 6) + 3, icon: '🔄' }, // 3-8
    { type: 'defuse', text: 'Saatli Bomba İmha Et', target: () => Math.floor(Math.random() * 3) + 1, icon: '⏱️' }, // 1-3
    { type: 'colormatch', text: 'Renk Çarpanı Yap', target: () => Math.floor(Math.random() * 3) + 2, icon: '🌈' }, // 2-4
    { type: 'crossclear', text: 'Çapraz Kırım Yap', target: () => Math.floor(Math.random() * 2) + 1, icon: '❌' }, // 1-2
    { type: 'stone', text: 'Taş Kır', target: () => Math.floor(Math.random() * 5) + 3, icon: '🪨' }, // 3-7
    // --- YENİ VE GELİŞMİŞ GÖREVLER ---
    { type: 'tamisabet', text: '3x3 Alan Kır', target: () => Math.floor(Math.random() * 2) + 1, icon: '🎯' },
    { type: 'sinirdevriyesi', text: 'Üst/Alt Satır Kır', target: () => Math.floor(Math.random() * 2) + 1, icon: '🛡️' },
    { type: 'serikatil', text: 'Arka Arkaya 3 Hamlede Kırım', target: () => 1, icon: '🗡️' },
    { type: 'buzkirangemisi', text: 'Tek Hamlede 3+ Buz Kır', target: () => Math.floor(Math.random() * 2) + 1, icon: '🚢' },
    { type: 'bombaimhauzmani', text: 'Tek Hamlede 2+ Bomba Patlat', target: () => 1, icon: '🧑‍🚒' },
    { type: 'daralanda', text: 'Kırım Yapmadan 10 Blok', target: () => 10, icon: '🗜️' },
    { type: 'meydanokuma', text: '5 Hamlede 3 Satır Kır', target: () => 3, icon: '🏆' },
    { type: 'katikurallar', text: '0 Döndürme İle 5 Satır', target: () => 5, icon: '📏' },
    { type: 'renklidiyet', text: 'Mavi Blok Patlatmadan 3 Satır', target: () => 3, icon: '🎨' },
    { type: 'kosekapmaca', text: '4 Köşeyi Doldur', target: () => 1, icon: '🔲' },
    { type: 'tetrisefsanesi', text: 'Sadece I Bloğu İle Kırım', target: () => Math.floor(Math.random() * 2) + 1, icon: '🏛️' },
    { type: 'boslukbirakmasanati', text: '3x3 Ortası Boş Şekil', target: () => 1, icon: '🍩' },
    { type: 'hiztesti', text: '30 Saniyede 5 Satır Kır', target: () => 5, icon: '⏱️' },
    { type: 'saatlibombapanigi', text: '15 Hamlede 3 Bomba İmha', target: () => 3, icon: '🆘' }
];

function initMission() {
    if (state.missionTimerId) {
        clearInterval(state.missionTimerId);
        state.missionTimerId = null;
    }

    const randomMissionTemplate = MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)];
    state.currentMission = {
        type: randomMissionTemplate.type,
        text: randomMissionTemplate.text,
        target: typeof randomMissionTemplate.target === 'function' ? randomMissionTemplate.target() : randomMissionTemplate.target,
        icon: randomMissionTemplate.icon,
        current: 0,
        completed: false
    };

    // Reset trackers
    state.missionMoves = 0;
    state.usedRotationsInMission = 0;

    if (state.currentMission.type === 'hiztesti') {
        state.missionTimeLeft = 30; // 30 seconds
        state.missionTimerId = setInterval(() => {
            if (!state.isGameOver && !state.currentMission.completed) {
                state.missionTimeLeft--;
                updateMissionUI();
                if (state.missionTimeLeft <= 0) {
                    try { AudioFX.playBuzzer(); } catch(e) {}
                    showFloatingText('Zaman Doldu! Yeni Görev', '#ff3333');
                    initMission(); // Restart with new mission
                }
            }
        }, 1000);
    }

    if (state.currentMission.type === 'saatlibombapanigi') {
        for(let i=0; i<3; i++) spawnTimeBomb();
    }

    updateMissionUI();
}

function updateMissionProgress(type, amount = 1) {
    if (!state.currentMission || state.currentMission.completed || state.isGameOver) return;

    if (state.currentMission.type === type) {
        state.currentMission.current += amount;
        if (state.currentMission.current >= state.currentMission.target) {
            state.currentMission.current = state.currentMission.target;
            completeMission();
        }
        updateMissionUI();
    }
}

function updateMissionUI() {
    const missionDescEl = document.getElementById('mission-desc');
    const missionProgressFillEl = document.getElementById('mission-progress-fill');
    const jokerCountEl = document.getElementById('joker-count');

    if (jokerCountEl) {
        jokerCountEl.textContent = state.jokers;
    }

    if (!state.currentMission) return;

    if (missionDescEl) {
        let extraText = '';
        if (state.currentMission.type === 'hiztesti') extraText = ` [⏱️ ${state.missionTimeLeft}s]`;
        if (state.currentMission.type === 'meydanokuma') extraText = ` [🏁 Kalan: ${5 - state.missionMoves}]`;
        if (state.currentMission.type === 'saatlibombapanigi') extraText = ` [🏁 Kalan: ${15 - state.missionMoves}]`;

        missionDescEl.textContent = `${state.currentMission.icon} ${state.currentMission.text}: ${state.currentMission.current}/${state.currentMission.target}${extraText}`;
    }

    if (missionProgressFillEl) {
        const percentage = (state.currentMission.current / state.currentMission.target) * 100;
        missionProgressFillEl.style.width = `${percentage}%`;
    }
}

function completeMission() {
    state.currentMission.completed = true;
    state.jokers++;
    updateJokerButtonsUI();
    localStorage.setItem('bomblok_jokers', state.jokers);

    // Play victory chime
    AudioFX.playMissionComplete();

    // Show embedded completion banner inside mission panel (smooth open)
    const banner = document.getElementById('mission-complete-banner');
    if (banner) {
        banner.classList.add('show');
    }

    // Hide after 2.5s and start a new mission
    setTimeout(() => {
        if (banner) {
            banner.classList.remove('show');
        }
        initMission();
    }, 2500);
}

// --- FEVER MODE MECHANICS ---
function activateFeverMode() {
    if (!state.isFeverActive) {
        updateMissionProgress('fever', 1);
    }
    state.isFeverActive = true;
    state.feverTimeLeft = 10.0; // 10 seconds

    document.body.classList.add('fever-active');
    if (feverBanner) {
        feverBanner.classList.remove('hidden');
    }

    // Accelerate background music
    AudioFX.setBgMusicTempo(300);

    if (state.feverIntervalId) {
        clearInterval(state.feverIntervalId);
    }

    if (feverBarFill) {
        feverBarFill.style.width = '100%';
    }

    state.feverIntervalId = setInterval(() => {
        state.feverTimeLeft -= 0.1;
        if (state.feverTimeLeft <= 0) {
            deactivateFeverMode();
        } else {
            if (feverBarFill) {
                feverBarFill.style.width = `${(state.feverTimeLeft / 10.0) * 100}%`;
            }
        }
    }, 100);
}

function deactivateFeverMode() {
    state.isFeverActive = false;
    state.feverTimeLeft = 0;
    if (state.feverIntervalId) {
        clearInterval(state.feverIntervalId);
        state.feverIntervalId = null;
    }

    document.body.classList.remove('fever-active');
    if (feverBanner) {
        feverBanner.classList.add('hidden');
    }

    // Reset background music tempo
    AudioFX.setBgMusicTempo(500);
}

// --- SCREEN SHAKE EFFECT ---
let shakeTimeoutId = null;
let activePopups = 0;

function triggerScreenShake(intensity) {
    const container = document.querySelector('.game-container');
    if (!container) return;

    if (shakeTimeoutId) {
        clearTimeout(shakeTimeoutId);
    }

    container.classList.remove('shake-mild', 'shake-heavy');
    void container.offsetWidth; // Trigger reflow to restart CSS animation

    const shakeClass = intensity === 'heavy' ? 'shake-heavy' : 'shake-mild';
    const duration = intensity === 'heavy' ? 350 : 200;

    container.classList.add(shakeClass);

    shakeTimeoutId = setTimeout(() => {
        container.classList.remove('shake-mild', 'shake-heavy');
        shakeTimeoutId = null;
    }, duration);
}

// --- FLOATING TEXT COMBO POPUPS ---
function showComboPopup(linesCleared, comboCount, isCrossClear = false) {
    if (linesCleared <= 0) return;

    const boardRect = gridBoard.getBoundingClientRect();
    const x = boardRect.left + boardRect.width / 2;
    const y = boardRect.top + boardRect.height / 2 - (activePopups * 45);
    activePopups++;

    let isGold = false;
    let lines = [];

    if (isCrossClear) {
        lines.push('MÜKEMMEL!');
        lines.push('CROSS BLAST!');
        isGold = true;
    } else if (linesCleared === 2) {
        lines.push('DOUBLE BLAST!');
    } else if (linesCleared === 3) {
        lines.push('TRIPLE BLAST!');
    } else if (linesCleared >= 4) {
        lines.push('MEGA BLAST!');
    } else {
        lines.push('HARİKA!');
    }

    if (comboCount > 1) {
        lines.push(`COMBO x${comboCount}!`);
    }
    if (comboCount >= 5) {
        lines.push('🔥 FEVER MODE! 🔥');
    }

    const popup = document.createElement('div');
    popup.classList.add('floating-text');
    if (isGold) {
        popup.classList.add('gold-glow');
    }

    let html = lines[0];
    if (lines.length > 1) {
        html += '<br><span style="font-size: 18px; color: #ff007f; display: block; margin-top: 4px;">';
        html += lines.slice(1).join('<br>');
        html += '</span>';
    }
    popup.innerHTML = html;

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.textAlign = 'center';

    document.body.appendChild(popup);

    setTimeout(() => {
        popup.remove();
        activePopups = Math.max(0, activePopups - 1);
    }, 2500);
}

// --- COLOR MATCH MECHANIC ---
function checkColorMatch(lineCells) {
    const colorCounts = {};
    let maxCount = 0;
    
    lineCells.forEach(cell => {
        if (cell !== 0 && cell !== 'ice') {
            const baseColor = typeof cell === 'string' ? cell.split('-')[0] : cell;
            colorCounts[baseColor] = (colorCounts[baseColor] || 0) + 1;
            if (colorCounts[baseColor] > maxCount) {
                maxCount = colorCounts[baseColor];
            }
        }
    });
    
    return maxCount >= 6; // 8 hücrenin en az 6'sı aynı renkse
}

function showFloatingText(text, color = '#00e5ff') {
    const boardRect = gridBoard.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.color = color;
    el.style.textShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
    
    // Position slightly higher (-60px) so it doesn't overlap with HARİKA!
    const x = boardRect.left + boardRect.width / 2;
    const y = boardRect.top + boardRect.height / 2 - 60 - (activePopups * 45);
    activePopups++;
    
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    
    document.body.appendChild(el);
    
    setTimeout(() => {
        el.remove();
        activePopups = Math.max(0, activePopups - 1);
    }, 2500); // Matches float-up-fade CSS animation duration
}

// --- TIME BOMB MECHANICS ---
function spawnTimeBomb() {
    const diff = getDifficultyParams();
    if (state.score < diff.timeBombScoreThreshold) return;
    
    if (Math.random() > diff.timeBombChance) return;
    
    let emptyCells = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state.grid[r][c] === 0) {
                emptyCells.push({ r, c });
            }
        }
    }
    
    if (emptyCells.length > 0) {
        const randCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const timer = diff.timerMin + Math.floor(Math.random() * (diff.timerMax - diff.timerMin + 1));
        state.grid[randCell.r][randCell.c] = 'timebomb';
        state.timeBombs.push({ r: randCell.r, c: randCell.c, timer: timer });
        
        const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${randCell.r}"][data-col="${randCell.c}"]`);
        if (cellEl) {
            cellEl.className = 'grid-cell filled filled-timebomb ice-spawn-anim';
            cellEl.dataset.timer = timer;
            setTimeout(() => { cellEl.classList.remove('ice-spawn-anim'); }, 500);
        }
        try { AudioFX.playBuzzer(); } catch(e) {}
    }
}

function tickTimeBombs() {
    for (let i = state.timeBombs.length - 1; i >= 0; i--) {
        const bomb = state.timeBombs[i];
        
        // Bomba temizlendiyse listeden çıkar
        if (state.grid[bomb.r][bomb.c] !== 'timebomb') {
            state.timeBombs.splice(i, 1);
            updateMissionProgress('defuse', 1);
            if (state.currentMission && state.currentMission.type === 'saatlibombapanigi') {
                updateMissionProgress('saatlibombapanigi', 1);
            }
            continue;
        }
        
        bomb.timer--;
        
        const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${bomb.r}"][data-col="${bomb.c}"]`);
        if (cellEl) {
            cellEl.dataset.timer = bomb.timer;
        }
        
        if (bomb.timer <= 0) {
            explodeTimeBomb(bomb.r, bomb.c);
            state.timeBombs.splice(i, 1);
        }
    }
}

function explodeTimeBomb(bombR, bombC) {
    try { AudioFX.playBomb(); } catch(e) {}
    triggerScreenShake('heavy');
    
    // O satırı komple taşa çevir
    for (let c = 0; c < 8; c++) {
        state.grid[bombR][c] = 'stone';
        spawnParticles(bombR, c, 'gray');
        const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${bombR}"][data-col="${c}"]`);
        if (cellEl) {
            cellEl.className = 'grid-cell filled filled-stone';
        }
    }
    showFloatingText("BOMBA PATLADI!", "#ff0044");
}

function endTurn() {
    tickTimeBombs();
    spawnTimeBomb();
    checkGameOver();
}

// --- GRID CLEARING & PATLAMA MECHANICS ---

function checkAndClearLines() {
    state.missionMoves++;
    let rowsToClear = [];
    let colsToClear = [];
    let iceBrokenThisMove = 0;
    let bombsExplodedThisMove = 0;

    // 1. Check rows
    for (let r = 0; r < 8; r++) {
        const isFull = state.grid[r].every(cell => cell !== 0);
        const isAllStone = state.grid[r].every(cell => cell === 'stone');
        if (isFull && !isAllStone) {
            rowsToClear.push(r);
        }
    }

    // 2. Check columns
    for (let c = 0; c < 8; c++) {
        let colFull = true;
        let allStone = true;
        for (let r = 0; r < 8; r++) {
            if (state.grid[r][c] === 0) {
                colFull = false;
                break;
            }
            if (state.grid[r][c] !== 'stone') {
                allStone = false;
            }
        }
        if (colFull && !allStone) {
            colsToClear.push(c);
        }
    }

    const isCrossClear = rowsToClear.length > 0 && colsToClear.length > 0;
    if (isCrossClear) {
        updateMissionProgress('crossclear', 1);
    }
    const linesCleared = rowsToClear.length + colsToClear.length;

    let colorMatchCount = 0;
    if (linesCleared > 0) {
        rowsToClear.forEach(r => {
            if (checkColorMatch(state.grid[r])) colorMatchCount++;
        });
        colsToClear.forEach(c => {
            const colCells = state.grid.map(row => row[c]);
            if (checkColorMatch(colCells)) colorMatchCount++;
        });

        // Increment consecutive combo multiplier
        state.comboCount++;
        if (state.comboCount >= 3) {
            updateMissionProgress('combo', 1);
        }

        if (linesCleared >= 2) {
            updateMissionProgress('multiclear', 1);
        }

        // Track lines cleared mission progress
        updateMissionProgress('lines', linesCleared);

        const cellsToClear = [];

        // Collect coordinates and current colors of cells in full rows/columns
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (rowsToClear.includes(r) || colsToClear.includes(c)) {
                    const cellColor = state.grid[r][c];
                    
                    // Taş bloklar satır/sütun kırılmasından etkilenmez, SADECE bombalarla kırılır.
                    if (cellColor === 'stone') {
                        continue;
                    }

                    cellsToClear.push({ r, c, color: cellColor });
                    
                    if (cellColor === 'ice') {
                        updateMissionProgress('ice', 1);
                        iceBrokenThisMove++;
                    }
                }
            }
        }

        // Check if a bomb was part of the initial clearing
        const hasBombInClearing = cellsToClear.some(cell => typeof cell.color === 'string' && cell.color.endsWith('-bomb'));

        // Fever Mode trigger: 3 consecutive clears (combos) or bomb in clearing
        const triggeredFeverNow = (state.comboCount >= 3 || hasBombInClearing);
        if (triggeredFeverNow) {
            activateFeverMode();
        }

        // Play clear sound (special powerup sound for cross-clear, regular chime for others)
        if (isCrossClear) {
            AudioFX.playCrossClear();
        } else {
            AudioFX.playClear(state.comboCount);
        }

        // Show floating combo text popups with multiplier and cross-clear state
        showComboPopup(linesCleared, state.comboCount, isCrossClear);

        // Trigger screen shake based on combo/lines cleared intensity, bomb, or Fever Mode
        if (linesCleared >= 3 || isCrossClear || state.comboCount >= 3 || hasBombInClearing || state.isFeverActive) {
            triggerScreenShake('heavy');
        } else {
            triggerScreenShake('mild');
        }

        // 1. Process Bomb Explosions (Chain-reaction)
        let bombCells = cellsToClear.filter(cell => typeof cell.color === 'string' && cell.color.endsWith('-bomb'));
        let explodedCells = new Set();
        // Add initial cleared cells to exploded list so they are not duplicate-processed
        cellsToClear.forEach(cell => explodedCells.add(`${cell.r},${cell.c}`));

        let hasBombExploded = false;

        while (bombCells.length > 0) {
            const nextBombCells = [];

            bombCells.forEach(bomb => {
                const bombR = bomb.r;
                const bombC = bomb.c;
                hasBombExploded = true;

                // Track bomb explosion mission progress
                updateMissionProgress('bombs', 1);
                bombsExplodedThisMove++;

                // Explode a 3x3 area
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = bombR + dr;
                        const nc = bombC + dc;

                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const cellColor = state.grid[nr][nc];
                            const key = `${nr},${nc}`;

                            // Bomb breaks normal blocks and ice blocks
                            if (cellColor !== 0 && !explodedCells.has(key)) {
                                explodedCells.add(key);

                                if (cellColor === 'ice') {
                                    // Melt/break ice block
                                    state.grid[nr][nc] = 0;
                                    spawnParticles(nr, nc, 'cyan');
                                    updateMissionProgress('ice', 1); // Track ice broken by bomb
                                    iceBrokenThisMove++;

                                    const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${nr}"][data-col="${nc}"]`);
                                    if (cellEl) {
                                        cellEl.classList.add('blasting');
                                        setTimeout(() => {
                                            cellEl.style.transition = 'none';
                                            cellEl.className = 'grid-cell';
                                            requestAnimationFrame(() => requestAnimationFrame(() => cellEl.style.transition = ''));
                                        }, 400);
                                    }
                                } else if (cellColor === 'stone') {
                                    // Break stone block with bomb
                                    state.grid[nr][nc] = 0;
                                    spawnParticles(nr, nc, 'gray');
                                    updateMissionProgress('stone', 1);

                                    const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${nr}"][data-col="${nc}"]`);
                                    if (cellEl) {
                                        cellEl.classList.add('blasting');
                                        setTimeout(() => {
                                            cellEl.style.transition = 'none';
                                            cellEl.className = 'grid-cell';
                                            requestAnimationFrame(() => requestAnimationFrame(() => cellEl.style.transition = ''));
                                        }, 400);
                                    }
                                } else {
                                    // Regular block or another bomb
                                    const cellObj = { r: nr, c: nc, color: cellColor };
                                    cellsToClear.push(cellObj);

                                    if (typeof cellColor === 'string' && cellColor.endsWith('-bomb')) {
                                        nextBombCells.push(cellObj);
                                    }
                                }
                            }
                        }
                    }
                }
            });
            bombCells = nextBombCells;
        }

        if (hasBombExploded) {
            AudioFX.playBomb();
            triggerScreenShake('heavy'); // Ensure heavy screen shake on bomb explosion
            activateFeverMode(); // Bomb explosion triggers/extends Fever Mode!
        }

        // 2. Melt ice blocks adjacent to cleared rows/cols
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (state.grid[r][c] === 'ice') {
                    const isAdjacentRow = rowsToClear.some(rowIdx => Math.abs(r - rowIdx) <= 1);
                    const isAdjacentCol = colsToClear.some(colIdx => Math.abs(c - colIdx) <= 1);

                    if (isAdjacentRow || isAdjacentCol) {
                        state.grid[r][c] = 0;
                        spawnParticles(r, c, 'cyan');
                        updateMissionProgress('ice', 1); // Track ice broken by adjacent clear
                        iceBrokenThisMove++;
                        const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                        if (cellEl) {
                            cellEl.classList.add('blasting');
                            setTimeout(() => {
                                cellEl.style.transition = 'none';
                                if (state.grid[r][c] === 0) {
                                    cellEl.className = 'grid-cell';
                                } else {
                                    cellEl.classList.remove('blasting', 'filled-ice');
                                }
                                requestAnimationFrame(() => requestAnimationFrame(() => cellEl.style.transition = ''));
                            }, 400);
                        }
                    }
                }
            }
        }

        // Trigger particle blast for each cell
        cellsToClear.forEach(cell => {
            const colorName = typeof cell.color === 'string' ? cell.color.split('-')[0] : 'orange';
            spawnParticles(cell.r, cell.c, colorName);
        });

        // Mark cells as empty in grid state immediately to allow placements
        cellsToClear.forEach(cell => {
            state.grid[cell.r][cell.c] = 0;
        });

        // Play CSS animation on grid cell elements
        cellsToClear.forEach(cell => {
            const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${cell.r}"][data-col="${cell.c}"]`);
            if (cellEl) {
                cellEl.classList.add('blasting');
            }
        });

        // Clean classes and styles from DOM after animation completes (400ms)
        setTimeout(() => {
            cellsToClear.forEach(cell => {
                const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${cell.r}"][data-col="${cell.c}"]`);
                if (cellEl) {
                    cellEl.style.transition = 'none'; // Prevent scale-up flash
                    if (state.grid[cell.r][cell.c] === 0) {
                        cellEl.className = 'grid-cell'; // Resets classes completely
                    } else {
                        cellEl.classList.remove('blasting'); // Keeps the newly placed block classes
                    }
                    requestAnimationFrame(() => requestAnimationFrame(() => cellEl.style.transition = ''));
                }
            });

            // If any columns were cleared, spawn random ice block(s)
            if (colsToClear.length > 0) {
                const diff = getDifficultyParams();
                const spawnCount = colsToClear.length * diff.iceSpawnMultiplier;
                for (let i = 0; i < spawnCount; i++) {
                    const emptyCells = [];
                    for (let r = 0; r < 8; r++) {
                        for (let c = 0; c < 8; c++) {
                            if (state.grid[r][c] === 0) {
                                emptyCells.push({ r, c });
                            }
                        }
                    }
                    if (emptyCells.length > 0) {
                        const randCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                        state.grid[randCell.r][randCell.c] = 'ice';
                        
                        const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${randCell.r}"][data-col="${randCell.c}"]`);
                        if (cellEl) {
                            cellEl.classList.add('filled', 'filled-ice', 'ice-spawn-anim');
                            // Clean animation class after it finishes
                            setTimeout(() => {
                                cellEl.classList.remove('ice-spawn-anim');
                            }, 500);
                        }
                    }
                }
            }

            // Check Game Over after board updates visually
            endTurn();
        }, 400);

        // Combo score: (lines cleared squared * 10) multiplied by combo count + optional cross-clear massive bonus
        const basePoints = linesCleared * 10 * linesCleared;
        let pointsAwarded = basePoints * state.comboCount;

        if (isCrossClear) {
            pointsAwarded += 150; // Devasa Cross-Blast Bonusu!
        }
        
        if (colorMatchCount > 0) {
            const multiplier = colorMatchCount * 3;
            pointsAwarded *= multiplier;
            showFloatingText(`🌈 COLOR MATCH x${multiplier}!`, '#00e5ff');
            updateMissionProgress('colormatch', colorMatchCount);
            try { AudioFX.playCrossClear(); } catch(e) {}
        }

        if (state.isFeverActive) {
            pointsAwarded *= 2; // Double points in Fever Mode!
        }

        state.score += pointsAwarded;
        updateMissionProgress('points', pointsAwarded); // Track points gathered mission progress
        updateScoreUI();
        // XP: kırımlar + patlamalar + buz/taş kırımları (aşırı büyümesin diye ölçekli)
        const xpGain = Math.min(250, Math.floor(pointsAwarded / 25) + linesCleared * 15 + bombsExplodedThisMove * 10 + iceBrokenThisMove * 5);
        addXp(xpGain);

        if (state.score > state.bestScore) {
            state.bestScore = state.score;
            localStorage.setItem('bomblok_best', state.bestScore);
            updateScoreUI();
        }

        // --- NEW MISSIONS TRACKING (Clear happened) ---
        state.movesSinceClear = 0;
        state.consecutiveClears++;

        if (state.currentMission) {
            const mType = state.currentMission.type;
            if (mType === 'tamisabet' && linesCleared >= 3) updateMissionProgress('tamisabet', 1);
            if (mType === 'sinirdevriyesi' && (rowsToClear.includes(0) || rowsToClear.includes(7))) updateMissionProgress('sinirdevriyesi', 1);
            if (mType === 'serikatil' && state.consecutiveClears >= 3) updateMissionProgress('serikatil', 1);
            if (mType === 'buzkirangemisi' && iceBrokenThisMove >= 3) updateMissionProgress('buzkirangemisi', 1);
            if (mType === 'bombaimhauzmani' && bombsExplodedThisMove >= 2) updateMissionProgress('bombaimhauzmani', 1);
            if (mType === 'meydanokuma') updateMissionProgress('meydanokuma', linesCleared);
            if (mType === 'katikurallar' && state.usedRotationsInMission === 0) updateMissionProgress('katikurallar', linesCleared);
            if (mType === 'hiztesti') updateMissionProgress('hiztesti', linesCleared);
            
            if (mType === 'renklidiyet') {
                const hasBlue = cellsToClear.some(c => String(c.color).includes('blue'));
                if (!hasBlue) updateMissionProgress('renklidiyet', linesCleared);
            }

            if (mType === 'tetrisefsanesi' && activeDrag && activeDrag.shape) {
                const rCount = activeDrag.shape.matrix.length;
                const cCount = activeDrag.shape.matrix[0].length;
                if ((rCount >= 3 && cCount === 1) || (rCount === 1 && cCount >= 3)) {
                    updateMissionProgress('tetrisefsanesi', 1);
                }
            }
        }
    } else {
        // No lines cleared in this move
        state.comboCount = 0;
        state.movesSinceClear++;
        state.consecutiveClears = 0;

        if (state.currentMission && state.currentMission.type === 'daralanda') {
            updateMissionProgress('daralanda', 1);
        }
    }

    // Check all constraints and end turn
    checkMissionConstraints();
    // Çift endTurn çağrısını engelle:
    // Satır/sütun kırımı olduysa endTurn() animasyon sonrası setTimeout içinde çağrılıyor.
    if (linesCleared === 0) {
        endTurn();
    }
}

// Function to validate non-clear constraints
function checkMissionConstraints() {
    if (!state.currentMission || state.currentMission.completed) return;
    const mType = state.currentMission.type;

    if (mType === 'meydanokuma' && state.missionMoves >= 5) {
        showFloatingText('Hamle Bitti! Görev Sıfırlandı', '#ff3333');
        initMission();
    }
    
    if (mType === 'saatlibombapanigi' && state.missionMoves >= 15) {
        showFloatingText('Hamle Bitti! Görev Sıfırlandı', '#ff3333');
        initMission();
    }

    if (mType === 'daralanda' && state.movesSinceClear === 0) {
        if (state.currentMission.current > 0) {
            state.currentMission.current = 0;
            updateMissionUI();
            showFloatingText('Kırım Yaptın! Seri Sıfırlandı', '#ffaa00');
        }
    }

    if (mType === 'kosekapmaca') {
        const corners = [state.grid[0][0], state.grid[0][7], state.grid[7][0], state.grid[7][7]];
        if (corners.every(c => c !== 0)) {
            updateMissionProgress('kosekapmaca', 1);
        }
    }

    if (mType === 'boslukbirakmasanati') {
        let found = false;
        for (let r=1; r<7; r++) {
            for (let c=1; c<7; c++) {
                if (state.grid[r][c] === 0) {
                    let allFull = true;
                    for (let dr=-1; dr<=1; dr++) {
                        for (let dc=-1; dc<=1; dc++) {
                            if (dr===0 && dc===0) continue;
                            if (state.grid[r+dr][c+dc] === 0) {
                                allFull = false;
                                break;
                            }
                        }
                        if (!allFull) break;
                    }
                    if (allFull) found = true;
                }
            }
        }
        if (found) {
            updateMissionProgress('boslukbirakmasanati', 1);
        }
    }
}

// Helper to rotate a matrix 90 degrees clockwise
function getRotatedMatrix(matrix) {
    const rCount = matrix.length;
    const cCount = matrix[0].length;
    const rotated = Array(cCount).fill(null).map(() => Array(rCount).fill(0));
    for (let r = 0; r < rCount; r++) {
        for (let c = 0; c < cCount; c++) {
            rotated[c][rCount - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

// Check if a single shape can fit anywhere on the current 8x8 grid
function canShapeFit(shape) {
    if (!shape) return false;
    const matrix = shape.matrix;
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Scan all possible offsets on the 8x8 grid
    for (let startR = 0; startR <= 8 - rows; startR++) {
        for (let startC = 0; startC <= 8 - cols; startC++) {
            let canPlace = true;

            // Check if all cells of the shape can be placed at this offset
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (matrix[r][c] === 1) {
                        const targetR = startR + r;
                        const targetC = startC + c;

                        // If cell is occupied, it cannot be placed here
                        if (state.grid[targetR][targetC] !== 0) {
                            canPlace = false;
                            break;
                        }
                    }
                }
                if (!canPlace) break;
            }

            if (canPlace) {
                return true; // Found at least one valid position!
            }
        }
    }
    return false; // Fits nowhere
}

// Check if shape can fit, considering rotated states if rotation rights > 0
function canShapeFitWithRotation(shape) {
    if (!shape) return false;

    // 1. Check current orientation
    if (canShapeFit(shape)) return true;

    // 2. If no rotation rights left, we cannot rotate.
    if (state.rotationRights <= 0) return false;

    // 3. Check 90, 180, 270 degree rotated states
    let tempMatrix = shape.matrix;
    for (let i = 0; i < 3; i++) {
        tempMatrix = getRotatedMatrix(tempMatrix);
        const tempShape = { matrix: tempMatrix };
        if (canShapeFit(tempShape)) {
            return true;
        }
    }

    return false;
}

// Check Game Over condition
function checkGameOver() {
    // Collect active blocks remaining in the dock
    const activeBlocks = state.dockedBlocks.filter(block => block !== null);

    // If no blocks are remaining in the dock, they will be regenerated shortly
    if (activeBlocks.length === 0) return;

    // Check if at least one remaining block can fit (with rotation if rights > 0)
    const anyBlockFits = activeBlocks.some(shape => canShapeFitWithRotation(shape));

    if (!anyBlockFits) {
        state.isGameOver = true;
        deactivateFeverMode();

        // Play game over tune
        AudioFX.playGameOver();

        // Show Game Over UI after a small delay
        setTimeout(() => {
            finalScoreEl.textContent = state.score;
            gameOverScreen.classList.remove('hidden');
        }, 600);

        console.log('Game Over! No shapes can fit.');
        updateJokerButtonsUI();
    }
}

// Update Scores on UI
function updateScoreUI() {
    currentScoreEl.textContent = state.score;
    bestScoreEl.textContent = state.bestScore;
    const rotRightsEl = document.getElementById('rotation-rights');
    if (rotRightsEl) {
        rotRightsEl.textContent = state.rotationRights;
    }
}

// --- SEVİYE & XP ---
function getXpToNext(level) {
    // Basit eğri: her seviye biraz daha fazla XP ister
    return 120 + (level - 1) * 60;
}

function syncProgressionUI() {
    const lvl = Math.max(1, state.level || 1);
    const xpNeeded = getXpToNext(lvl);
    const xp = Math.max(0, state.xp || 0);
    const pct = xpNeeded > 0 ? Math.min(100, (xp / xpNeeded) * 100) : 0;

    if (playerLevelEl) playerLevelEl.textContent = String(lvl);
    if (xpBarFillEl) xpBarFillEl.style.width = `${pct}%`;
    if (xpTextEl) xpTextEl.textContent = `${xp}/${xpNeeded} XP`;
}

function saveProgression() {
    localStorage.setItem('bomblok_level', String(state.level));
    localStorage.setItem('bomblok_xp', String(state.xp));
}

function addXp(amount) {
    if (!amount || amount <= 0) return;
    state.xp += Math.floor(amount);

    let leveledUp = false;
    while (state.xp >= getXpToNext(state.level)) {
        state.xp -= getXpToNext(state.level);
        state.level += 1;
        leveledUp = true;
        // küçük ödül: level atlayınca 1 joker
        state.jokers += 1;
        localStorage.setItem('bomblok_jokers', state.jokers);
        showFloatingText(`SEVİYE ATLADIN! (${state.level}) +1 JOKER`, '#00ffcc');
    }

    if (leveledUp) {
        // zorluk eğrisi seviye ile güncellendiği için ek bir şey yapmaya gerek yok
    }

    saveProgression();
    syncProgressionUI();
    updateJokerButtonsUI();
}

// --- LEADERBOARD (SUPABASE) ---
function getISOWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // 1..7 (Mon..Sun)
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Perşembe referansı
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const Leaderboard = {
    client: null,
    enabled: false,
    view: 'weekly', // weekly | global

    init() {
        const url = window.SUPABASE_URL;
        const key = window.SUPABASE_ANON_KEY;
        const hasConfig =
            typeof url === 'string' && url.startsWith('https://') && !url.includes('YOUR_PROJECT_REF') &&
            typeof key === 'string' && key.length > 20 && !key.includes('YOUR_SUPABASE_ANON_KEY');

        if (window.supabase && hasConfig) {
            try {
                this.client = window.supabase.createClient(url, key);
                this.enabled = true;
            } catch (e) {
                this.enabled = false;
            }
        }

        if (leaderboardBtn && leaderboardModal) {
            leaderboardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
        }
        if (leaderboardCloseBtn && leaderboardModal) {
            leaderboardCloseBtn.addEventListener('click', () => this.close());
        }
        if (leaderboardModal) {
            leaderboardModal.addEventListener('click', (e) => {
                if (e.target === leaderboardModal) this.close();
            });
        }

        if (lbTabWeekly) lbTabWeekly.addEventListener('click', () => this.setView('weekly'));
        if (lbTabGlobal) lbTabGlobal.addEventListener('click', () => this.setView('global'));

        if (submitScoreBtn) {
            submitScoreBtn.addEventListener('click', async () => {
                await this.submitCurrentScore();
            });
        }
    },

    open() {
        if (!leaderboardModal) return;
        leaderboardModal.classList.remove('hidden');
        this.refresh();
    },

    close() {
        if (!leaderboardModal) return;
        leaderboardModal.classList.add('hidden');
    },

    setView(view) {
        this.view = view;
        if (lbTabWeekly) lbTabWeekly.classList.toggle('active', view === 'weekly');
        if (lbTabGlobal) lbTabGlobal.classList.toggle('active', view === 'global');
        this.refresh();
    },

    setStatus(text) {
        if (leaderboardStatusEl) leaderboardStatusEl.textContent = text;
    },

    render(rows) {
        if (!leaderboardListEl) return;
        if (!rows || rows.length === 0) {
            leaderboardListEl.innerHTML = '';
            this.setStatus('Henüz kayıt yok.');
            return;
        }

        leaderboardListEl.innerHTML = rows.map((r, idx) => {
            const name = (r.nickname || '???').toString().slice(0, 20);
            const score = Number(r.score || 0);
            return `
                <div class="lb-row">
                    <div class="lb-rank">#${idx + 1}</div>
                    <div class="lb-name">${escapeHtml(name)}</div>
                    <div class="lb-score">${score}</div>
                </div>
            `;
        }).join('');
        this.setStatus(this.view === 'weekly' ? 'Haftalık en iyiler' : 'Global en iyiler');
    },

    async refresh() {
        if (!this.enabled || !this.client) {
            this.setStatus('Supabase ayarlı değil. `supabase-config.js` dosyasını doldur.');
            if (leaderboardListEl) leaderboardListEl.innerHTML = '';
            if (submitScoreBtn) submitScoreBtn.disabled = true;
            return;
        }

        if (submitScoreBtn) submitScoreBtn.disabled = false;
        this.setStatus('Yükleniyor...');
        try {
            const weekKey = getISOWeekKey();
            let q = this.client.from('scores').select('nickname, score, created_at');
            if (this.view === 'weekly') q = q.eq('week_key', weekKey);
            const { data, error } = await q.order('score', { ascending: false }).limit(20);
            if (error) throw error;
            this.render(data);
        } catch (err) {
            this.setStatus('Yüklenemedi. İnternet / RLS ayarlarını kontrol et.');
            if (leaderboardListEl) leaderboardListEl.innerHTML = '';
        }
    },

    async ensureNickname() {
        let nick = (state.nickname || '').trim();
        if (nick.length >= 2 && nick.length <= 16) return nick;

        const input = window.prompt('Rumuzunu gir (2-16 karakter):', nick || '');
        if (!input) return null;
        nick = input.trim().slice(0, 16);
        if (nick.length < 2) return null;

        state.nickname = nick;
        localStorage.setItem('bomblok_nickname', nick);
        return nick;
    },

    async submitCurrentScore() {
        if (!this.enabled || !this.client) {
            this.setStatus('Supabase ayarlı değil. Önce `supabase-config.js` doldur.');
            return;
        }

        const nick = await this.ensureNickname();
        if (!nick) {
            this.setStatus('Rumuz geçersiz.');
            return;
        }

        const score = Number(state.score || 0);
        if (!Number.isFinite(score) || score <= 0) {
            this.setStatus('Skor 0 iken gönderilemez.');
            return;
        }

        this.setStatus('Gönderiliyor...');
        try {
            const payload = {
                nickname: nick,
                score,
                week_key: getISOWeekKey()
            };
            const { error } = await this.client.from('scores').insert(payload);
            if (error) throw error;
            this.setStatus('Skor gönderildi!');
            await this.refresh();
        } catch (err) {
            this.setStatus('Gönderilemedi. RLS/policy veya interneti kontrol et.');
        }
    }
};

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// --- JOKER MECHANICS: UNDO & REROLL ---
const undoBtn = document.getElementById('undo-btn');
const rerollBtn = document.getElementById('reroll-btn');
const rotationRightsBtn = document.getElementById('rotation-rights-btn');

function saveStateSnapshot() {
    state.previousState = {
        grid: JSON.parse(JSON.stringify(state.grid)),
        dockedBlocks: JSON.parse(JSON.stringify(state.dockedBlocks)),
        score: state.score,
        comboCount: state.comboCount,
        rotationRights: state.rotationRights,
        isFeverActive: state.isFeverActive,
        feverTimeLeft: state.feverTimeLeft,
        currentMission: state.currentMission ? JSON.parse(JSON.stringify(state.currentMission)) : null
    };
}

function updateJokerButtonsUI() {
    const jokerCountEl = document.getElementById('joker-count');
    if (jokerCountEl) jokerCountEl.textContent = state.jokers;

    if (undoBtn) {
        undoBtn.disabled = (
            state.jokers <= 0 ||
            !state.previousState ||
            state.undoUsedThisGame
        );
    }
    if (rerollBtn) {
        rerollBtn.disabled = (
            state.jokers <= 0 ||
            state.rerollUsedThisGame ||
            state.dockedBlocks.every(b => b === null)
        );
    }
    if (rotationRightsBtn) {
        rotationRightsBtn.disabled = (
            (state.rotationRights <= 0 && state.jokers <= 0) ||
            state.isGameOver
        );
    }
}

function performUndo() {
    if (!state.previousState || state.jokers <= 0 || state.undoUsedThisGame) return;

    // Deduct joker
    state.jokers--;
    localStorage.setItem('bomblok_jokers', state.jokers);
    state.undoUsedThisGame = true;

    // Restore state
    const prev = state.previousState;
    state.grid = prev.grid;
    state.dockedBlocks = prev.dockedBlocks;
    state.score = prev.score;
    state.comboCount = prev.comboCount;
    state.rotationRights = prev.rotationRights;
    if (prev.currentMission) state.currentMission = prev.currentMission;

    // Handle fever restore
    if (prev.isFeverActive && !state.isFeverActive) {
        activateFeverMode();
    } else if (!prev.isFeverActive && state.isFeverActive) {
        deactivateFeverMode();
    }

    // If was game over, cancel it
    if (state.isGameOver) {
        state.isGameOver = false;
        gameOverScreen.classList.add('hidden');
    }

    state.previousState = null;

    // Re-draw everything
    deselectBlock();
    initGrid();
    redrawDock();
    updateScoreUI();
    updateMissionUI();
    updateJokerButtonsUI();

    AudioFX.playUndo();
}

function rerollDockBlocks() {
    if (state.jokers <= 0 || state.rerollUsedThisGame) return;

    // Deduct joker
    state.jokers--;
    localStorage.setItem('bomblok_jokers', state.jokers);
    state.rerollUsedThisGame = true;

    // Generate new blocks for remaining slots
    const slots = document.querySelectorAll('.dock-slot');
    state.dockedBlocks.forEach((block, index) => {
        if (block !== null) {
            // Generate new random shape
            let randomShapeIndex = Math.floor(Math.random() * SHAPES.length);
            let shape = JSON.parse(JSON.stringify(SHAPES[randomShapeIndex]));

            // Reduce 1x1 single block frequency
            if (shape.matrix.length === 1 && shape.matrix[0].length === 1) {
                if (Math.random() < 0.95) {
                    const nonSingleShapes = SHAPES.filter(s => !(s.matrix.length === 1 && s.matrix[0].length === 1));
                    shape = JSON.parse(JSON.stringify(nonSingleShapes[Math.floor(Math.random() * nonSingleShapes.length)]));
                }
            }

            // 25% chance for bomb
            if (Math.random() < 0.25) {
                const solidCells = [];
                for (let r = 0; r < shape.matrix.length; r++) {
                    for (let c = 0; c < shape.matrix[r].length; c++) {
                        if (shape.matrix[r][c] === 1) solidCells.push({ r, c });
                    }
                }
                if (solidCells.length > 0) {
                    shape.bombCell = solidCells[Math.floor(Math.random() * solidCells.length)];
                }
            }

            state.dockedBlocks[index] = shape;
        }
    });

    // Re-draw dock
    deselectBlock();
    redrawDock();

    // If was game over, check if new blocks fit
    if (state.isGameOver) {
        const activeBlocks = state.dockedBlocks.filter(b => b !== null);
        const anyFits = activeBlocks.some(s => canShapeFitWithRotation(s));
        if (anyFits) {
            state.isGameOver = false;
            gameOverScreen.classList.add('hidden');
        }
    }

    updateJokerButtonsUI();
    AudioFX.playReroll();
}

function redrawDock() {
    const slots = document.querySelectorAll('.dock-slot');
    slots.forEach((slot, index) => {
        slot.innerHTML = '';
        const shape = state.dockedBlocks[index];
        if (shape) {
            renderBlockInSlot(shape, slot, index);
        }
    });
}

function animateAndRotateBlock(slotIndex, shape) {
    const blockEl = blockDock.querySelector(`.block-shape[data-slot-index="${slotIndex}"]`);
    if (blockEl) {
        blockEl.classList.add('rotating-smooth');
        blockEl.addEventListener('transitionend', () => {
            blockEl.classList.remove('rotating-smooth');
            deselectBlock();
            redrawDock();
            selectBlock(slotIndex);
            checkGameOver();
            updateJokerButtonsUI();
        }, { once: true });
    } else {
        deselectBlock();
        redrawDock();
        selectBlock(slotIndex);
        checkGameOver();
        updateJokerButtonsUI();
    }
}

// Reset Game
function resetGame() {
    state.grid = Array(8).fill(null).map(() => Array(8).fill(0));
    state.timeBombs = [];
    state.score = 0;
    state.comboCount = 0;
    state.rotationRights = 0;
    state.isGameOver = false;
    state.previousState = null;
    state.undoUsedThisGame = false;
    state.rerollUsedThisGame = false;
    deactivateFeverMode();
    initMission();
    deselectBlock();
    gameOverScreen.classList.add('hidden');
    spawnIceBlocks();
    initGrid();
    generateDockBlocks();
    updateJokerButtonsUI();
    syncProgressionUI();
}

// Event Listeners
restartBtn.addEventListener('click', () => {
    resetGame();
});

// Help Modal Event Listeners
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.init();
        AudioFX.playGrab();
        helpModal.classList.remove('hidden');
    });
}

if (helpModal) {
    helpModal.addEventListener('click', (e) => {
        // Close if clicking the overlay itself (outside the modal-card)
        if (e.target === helpModal) {
            AudioFX.init();
            AudioFX.playGrab();
            helpModal.classList.add('hidden');
        }
    });
}

if (helpCloseBtn) {
    helpCloseBtn.addEventListener('click', () => {
        AudioFX.init();
        AudioFX.playGrab();
        helpModal.classList.add('hidden');
    });
}

if (modalStartBtn) {
    modalStartBtn.addEventListener('click', () => {
        AudioFX.init();
        AudioFX.playGrab();
        helpModal.classList.add('hidden');
    });
}

// Deselect selected block if clicked outside of any dock slot or grid cell
window.addEventListener('click', (e) => {
    if (state.selectedBlockIndex !== null) {
        if (!e.target.closest('.dock-slot') && !e.target.closest('.grid-cell')) {
            deselectBlock();
        }
    }
});

// Attach pointerdown event to dock slots for easy selecting/dragging
document.querySelectorAll('.dock-slot').forEach((slot, index) => {
    slot.addEventListener('pointerdown', (e) => {
        if (state.isGameOver) return;
        const shape = state.dockedBlocks[index];
        if (!shape) return;
        const blockEl = slot.querySelector('.block-shape');
        if (!blockEl) return;

        onPointerDown(e, blockEl, shape, index);
    });
});

// Boot the game
ThemeManager.init(); // Initialize Theme Manager
Leaderboard.init();
syncProgressionUI();
state.grid = Array(8).fill(null).map(() => Array(8).fill(0));
spawnIceBlocks(); // Spawn initial ice blocks
initGrid();
resizeCanvas(); // Align canvas size to grid
generateDockBlocks();
initMission(); // Initialize first mission!
updateJokerButtonsUI(); // Set initial button states

// Joker button event listeners
if (undoBtn) {
    undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.init();
        performUndo();
    });
}
if (rerollBtn) {
    rerollBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.init();
        rerollDockBlocks();
    });
}
if (rotationRightsBtn) {
    rotationRightsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.init();
        
        // Sadece joker harcayarak döndürme hakkı alma işlemi
        if (state.jokers > 0) {
            state.jokers--;
            localStorage.setItem('bomblok_jokers', state.jokers);
            state.rotationRights += 1;
            
            updateMissionProgress('rotate', 1);
            
            updateScoreUI();
            updateJokerButtonsUI();
            updateMissionUI();
            AudioFX.playReroll(); // Satın alma sesi
            
            const btnRect = rotationRightsBtn.getBoundingClientRect();
            spawnParticlesAtScreen(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2, 'gold');
        } else {
            // Joker yoksa uyarı sesi ve sarsılma efekti
            AudioFX.playBuzzer();
            rotationRightsBtn.classList.add('shake');
            setTimeout(() => rotationRightsBtn.classList.remove('shake'), 400);
        }
    });
}

console.log('BomBlok Initialized: Game Fully Functional!');
