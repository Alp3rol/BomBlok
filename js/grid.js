import { state, gridBoard } from './state.js';
import { SHAPES, getDifficultyParams } from './config.js';
import { updateScoreUI } from './mechanics.js';

var _showPreview = null;
var _tryPlace = null;

export function registerGridCallbacks(showPreview, tryPlace) {
    _showPreview = showPreview;
    _tryPlace = tryPlace;
}

// Spawn random ice block obstacles on the board
export function spawnIceBlocks() {
    const diff = getDifficultyParams(state.level);
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
export function initGrid() {
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
                    _showPreview && _showPreview(r, c);
                }
            });

            cell.addEventListener('pointerleave', () => {
                if (state.selectedBlockIndex !== null) {
                    clearGridHighlights();
                }
            });

            cell.addEventListener('click', () => {
                if (state.selectedBlockIndex !== null) {
                    _tryPlace && _tryPlace(r, c);
                }
            });

            gridBoard.appendChild(cell);
        }
    }
    updateScoreUI();
}

// Generate 3 random shapes and place them in the dock
export function generateDockBlocks() {
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
export function renderBlockInSlot(shape, slot, index) {
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

export function clearGridHighlights() {
    const cells = gridBoard.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.classList.remove('highlight-valid', 'highlight-invalid');
    });
}

export function redrawDock() {
    const slots = document.querySelectorAll('.dock-slot');
    slots.forEach((slot, index) => {
        slot.innerHTML = '';
        const shape = state.dockedBlocks[index];
        if (shape) {
            renderBlockInSlot(shape, slot, index);
        }
    });
}
