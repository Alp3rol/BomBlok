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

// Game State
const state = {
    grid: Array(8).fill(null).map(() => Array(8).fill(0)), // 0 = empty, string (e.g., 'blue') = color of filled block
    score: 0,
    bestScore: parseInt(localStorage.getItem('bomblok_best') || localStorage.getItem('block_blast_best') || '0', 10),
    dockedBlocks: [null, null, null], // Holds current shapes on dock
    isGameOver: false,
    comboCount: 0, // Track consecutive clears!
    rotationRights: 3, // Rotation rights per game!
    selectedBlockIndex: null, // Track selected block for click-to-place
    isFeverActive: false,
    feverTimeLeft: 0,
    feverIntervalId: null
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
        document.body.classList.remove('theme-dark', 'theme-neon', 'theme-wood', 'theme-retro');

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
    cyan: '#48dbfb'
};

let particles = [];
let isLoopRunning = false;

class Particle {
    constructor(x, y, colorName) {
        this.x = x;
        this.y = y;
        this.color = COLOR_MAP[colorName] || '#ff007f';
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 4.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = 2.5 + Math.random() * 3.5;
        this.alpha = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95; // Friction
        this.vy *= 0.95;
        this.alpha -= this.decay;
    }

    draw(c) {
        c.save();
        c.globalAlpha = Math.max(0, this.alpha);
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.shadowBlur = 8;
        c.shadowColor = this.color;
        c.fill();
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
    let iceCount = 3 + Math.floor(Math.random() * 3); // 3 to 5 ice blocks
    while (iceCount > 0) {
        const r = Math.floor(Math.random() * 8);
        const c = Math.floor(Math.random() * 8);
        if (state.grid[r][c] === 0) {
            state.grid[r][c] = 'ice';
            iceCount--;
        }
    }
}

// Initialize Grid Board HTML
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

    // Total block size (assuming 32px cells + gaps)
    const cellSize = 32;
    const gap = 4;
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
    targetCells: [], // Array of { r, c, el }
    originalSlot: null, // Store parent container
    startX: 0,
    startY: 0,
    startTime: 0,
    offsetR: null,
    offsetC: null
};

function onPointerDown(e, blockEl, shape, slotIndex) {
    if (state.isGameOver) return;
    e.preventDefault();

    AudioFX.playGrab();

    // Setup active drag state
    activeDrag.blockEl = blockEl;
    activeDrag.shape = shape;
    activeDrag.slotIndex = slotIndex;
    activeDrag.pointerId = e.pointerId;
    activeDrag.originalSlot = blockEl.parentElement;
    activeDrag.startX = e.clientX;
    activeDrag.startY = e.clientY;
    activeDrag.startTime = Date.now();

    // Calculate grid cell size from active board
    const firstGridCell = gridBoard.querySelector('.grid-cell');
    activeDrag.gridCellSize = firstGridCell.getBoundingClientRect().width;
    activeDrag.gap = 6; // Matching grid gap

    // Center the block horizontally under pointer and center vertically
    const cols = shape.matrix[0].length;
    const rows = shape.matrix.length;
    const targetWidth = cols * activeDrag.gridCellSize + (cols - 1) * activeDrag.gap;
    const targetHeight = rows * activeDrag.gridCellSize + (rows - 1) * activeDrag.gap;

    activeDrag.dragOffset = {
        x: targetWidth / 2,
        y: targetHeight / 2
    };

    // Set dragging styles
    blockEl.classList.remove('in-dock');
    blockEl.classList.add('dragging');

    // Append to document.body to prevent backdrop-filter containing block offset issues
    document.body.appendChild(blockEl);

    blockEl.style.position = 'fixed';
    blockEl.style.width = `${targetWidth}px`;
    blockEl.style.height = `${targetHeight}px`;
    blockEl.style.gap = `${activeDrag.gap}px`;

    // Initial position
    blockEl.style.left = `${e.clientX - activeDrag.dragOffset.x}px`;
    blockEl.style.top = `${e.clientY - activeDrag.dragOffset.y}px`;

    // Capture pointer
    blockEl.setPointerCapture(e.pointerId);

    // Listen for movement and release
    blockEl.addEventListener('pointermove', onPointerMove);
    blockEl.addEventListener('pointerup', onPointerUp);
    blockEl.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
    if (!activeDrag.blockEl || e.pointerId !== activeDrag.pointerId) return;

    const blockEl = activeDrag.blockEl;

    // Update visual position
    blockEl.style.left = `${e.clientX - activeDrag.dragOffset.x}px`;
    blockEl.style.top = `${e.clientY - activeDrag.dragOffset.y}px`;

    // Calculate hover / placement preview
    checkPlacementValidity();
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

    // 2. Validate placement if we found a valid grid offset
    if (offsetR !== null && offsetC !== null) {
        let fits = true;
        const proposedCells = [];

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

                    // Already occupied
                    if (state.grid[targetR][targetC] !== 0) {
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
            activeDrag.validPlacement = true;
            activeDrag.targetCells = proposedCells;
            activeDrag.offsetR = offsetR;
            activeDrag.offsetC = offsetC;

            // Apply highlight class to candidate grid cells
            proposedCells.forEach(cell => {
                cell.el.classList.add('highlight-valid');
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
                proposedCells.push(cellEl);
            }
        }
        if (!fits) break;
    }

    if (fits) {
        proposedCells.forEach(el => {
            if (el) el.classList.add('highlight-valid');
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
    } else {
        AudioFX.playBuzzer();
    }
}

function onPointerUp(e) {
    if (!activeDrag.blockEl || e.pointerId !== activeDrag.pointerId) return;

    const { blockEl, shape, slotIndex, validPlacement, targetCells, originalSlot, startX, startY, startTime } = activeDrag;

    // Clean up event listeners
    blockEl.removeEventListener('pointermove', onPointerMove);
    blockEl.removeEventListener('pointerup', onPointerUp);
    blockEl.removeEventListener('pointercancel', onPointerUp);

    clearGridHighlights();

    // 1. Detect if this was a quick click/tap instead of a drag
    const clickDuration = Date.now() - startTime;
    const clickDistance = Math.hypot(e.clientX - startX, e.clientY - startY);

    if (clickDuration < 220 && clickDistance < 10) {
        if (state.selectedBlockIndex !== slotIndex) {
            selectBlock(slotIndex);

            // Return block to dock visually
            blockEl.style.position = '';
            blockEl.style.left = '';
            blockEl.style.top = '';
            if (originalSlot) {
                originalSlot.innerHTML = '';
                originalSlot.appendChild(blockEl);
            }

            blockEl.classList.remove('dragging');
            blockEl.classList.add('in-dock');

            activeDrag = {
                blockEl: null, shape: null, slotIndex: null, pointerId: null,
                dragOffset: { x: 0, y: 0 }, gridCellSize: 0, gap: 6,
                validPlacement: false, targetCells: [], originalSlot: null,
                startX: 0, startY: 0, startTime: 0, offsetR: null, offsetC: null
            };
            return;
        }

        // Check rotation rights
        if (state.rotationRights <= 0) {
            AudioFX.playBuzzer();

            // Return block to dock visually
            blockEl.style.position = '';
            blockEl.style.left = '';
            blockEl.style.top = '';
            if (originalSlot) {
                originalSlot.innerHTML = '';
                originalSlot.appendChild(blockEl);
            }

            blockEl.classList.remove('dragging');
            blockEl.classList.add('in-dock');

            activeDrag = {
                blockEl: null, shape: null, slotIndex: null, pointerId: null,
                dragOffset: { x: 0, y: 0 }, gridCellSize: 0, gap: 6,
                validPlacement: false, targetCells: [], originalSlot: null,
                startX: 0, startY: 0, startTime: 0, offsetR: null, offsetC: null
            };
            return;
        }

        // Consume 1 rotation right
        state.rotationRights--;
        updateScoreUI();

        // Play rotate sound
        AudioFX.playRotate();

        // Rotate shape matrix 90 degrees clockwise
        const rCount = shape.matrix.length;
        shape.matrix = getRotatedMatrix(shape.matrix);

        // If block has a bomb cell, rotate its bomb coordinates as well!
        if (shape.bombCell) {
            const oldR = shape.bombCell.r;
            const oldC = shape.bombCell.c;
            shape.bombCell.r = oldC;
            shape.bombCell.c = rCount - 1 - oldR;
        }

        // Update shape state
        state.dockedBlocks[slotIndex] = shape;

        // Clear drag styles, snap back to slot immediately
        blockEl.style.position = '';
        blockEl.style.left = '';
        blockEl.style.top = '';

        if (originalSlot) {
            originalSlot.innerHTML = '';
            originalSlot.appendChild(blockEl);
        }

        // Trigger CSS rotate animation
        blockEl.classList.remove('dragging');
        blockEl.classList.add('rotating');

        blockEl.addEventListener('animationend', () => {
            if (originalSlot) {
                originalSlot.innerHTML = '';
                renderBlockInSlot(shape, originalSlot, slotIndex);
            }
            // Recalculate game over check since shape dimensions/orientation changed
            checkGameOver();
        }, { once: true });

        // Reset active drag state
        activeDrag = {
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
            offsetC: null
        };
        return;
    }

    // 2. Normal placement logic
    if (validPlacement && targetCells.length > 0) {
        const { offsetR, offsetC } = activeDrag;

        // Place Block
        targetCells.forEach(cell => {
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

        // Add score (1 point per filled cell)
        let shapeScore = targetCells.length;
        if (state.isFeverActive) {
            shapeScore *= 2;
        }
        state.score += shapeScore;
        updateScoreUI();

        // Clear block from dock
        state.dockedBlocks[slotIndex] = null;
        blockEl.remove();

        // Play drop sound effect
        AudioFX.playDrop();

        // Clear selection just in case
        deselectBlock();

        // Perform line clears
        checkAndClearLines();

        // Check if dock is completely empty
        const isDockEmpty = state.dockedBlocks.every(block => block === null);
        if (isDockEmpty) {
            generateDockBlocks();
        }

    } else {
        // Append back to its original slot
        if (originalSlot) {
            originalSlot.appendChild(blockEl);
        }

        // Return block to dock
        blockEl.classList.remove('dragging');
        blockEl.classList.add('in-dock');

        // Reset absolute positioning styles
        blockEl.style.position = '';
        blockEl.style.left = '';
        blockEl.style.top = '';

        // Reset slot size
        const cellSize = 32;
        const gap = 4;
        const rows = shape.matrix.length;
        const cols = shape.matrix[0].length;
        blockEl.style.width = `${cols * cellSize + (cols - 1) * gap}px`;
        blockEl.style.height = `${rows * cellSize + (rows - 1) * gap}px`;
        blockEl.style.gap = `${gap}px`;
    }

    // Reset active drag state
    activeDrag = {
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
        offsetC: null
    };
}

// --- FEVER MODE MECHANICS ---
function activateFeverMode() {
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
    const y = boardRect.top + boardRect.height / 2;

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
    }, 2500);
}

// --- GRID CLEARING & PATLAMA MECHANICS ---

function checkAndClearLines() {
    let rowsToClear = [];
    let colsToClear = [];

    // 1. Check rows
    for (let r = 0; r < 8; r++) {
        if (state.grid[r].every(cell => cell !== 0)) {
            rowsToClear.push(r);
        }
    }

    // 2. Check columns
    for (let c = 0; c < 8; c++) {
        let colFull = true;
        for (let r = 0; r < 8; r++) {
            if (state.grid[r][c] === 0) {
                colFull = false;
                break;
            }
        }
        if (colFull) {
            colsToClear.push(c);
        }
    }

    const isCrossClear = rowsToClear.length > 0 && colsToClear.length > 0;
    const linesCleared = rowsToClear.length + colsToClear.length;

    if (linesCleared > 0) {
        // Increment consecutive combo multiplier
        state.comboCount++;

        const cellsToClear = [];

        // Collect coordinates and current colors of cells in full rows/columns
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (rowsToClear.includes(r) || colsToClear.includes(c)) {
                    cellsToClear.push({ r, c, color: state.grid[r][c] });
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
                                    const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${nr}"][data-col="${nc}"]`);
                                    if (cellEl) {
                                        cellEl.className = 'grid-cell blasting';
                                        setTimeout(() => { cellEl.className = 'grid-cell'; }, 400);
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
                        const cellEl = gridBoard.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                        if (cellEl) {
                            cellEl.className = 'grid-cell blasting';
                            setTimeout(() => { cellEl.className = 'grid-cell'; }, 400);
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
                    cellEl.className = 'grid-cell'; // Resets classes completely
                }
            });

            // Check Game Over after board updates visually
            checkGameOver();
        }, 400);

        // Combo score: (lines cleared squared * 10) multiplied by combo count + optional cross-clear massive bonus
        const basePoints = linesCleared * 10 * linesCleared;
        let pointsAwarded = basePoints * state.comboCount;

        if (isCrossClear) {
            pointsAwarded += 150; // Devasa Cross-Blast Bonusu!
        }

        if (state.isFeverActive) {
            pointsAwarded *= 2; // Double points in Fever Mode!
        }

        state.score += pointsAwarded;
        updateScoreUI();

        if (state.score > state.bestScore) {
            state.bestScore = state.score;
            localStorage.setItem('bomblok_best', state.bestScore);
            updateScoreUI();
        }
    } else {
        // No lines cleared in this move, reset consecutive combo count
        state.comboCount = 0;

        // Check Game Over directly
        checkGameOver();
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

// Reset Game
function resetGame() {
    state.grid = Array(8).fill(null).map(() => Array(8).fill(0));
    state.score = 0;
    state.comboCount = 0;
    state.rotationRights = 3; // Reset rotation rights!
    state.isGameOver = false;
    deactivateFeverMode();
    deselectBlock(); // Reset block selection state
    gameOverScreen.classList.add('hidden');
    spawnIceBlocks(); // Spawn ice blocks on reset
    initGrid();
    generateDockBlocks();
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
state.grid = Array(8).fill(null).map(() => Array(8).fill(0));
spawnIceBlocks(); // Spawn initial ice blocks
initGrid();
resizeCanvas(); // Align canvas size to grid
generateDockBlocks();
console.log('BomBlok Initialized: Game Fully Functional!');
