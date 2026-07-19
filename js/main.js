import { state, gridBoard, blockDock, gameOverScreen, restartBtn, helpBtn, helpModal, helpCloseBtn, modalStartBtn } from './state.js';
import { applyProgressResetIfNeeded } from './config.js';
import { AudioFX } from './audio.js';
import { ThemeManager } from './theme.js';
import { resizeCanvas, spawnParticlesAtScreen } from './particles.js';
import { initGrid, clearGridHighlights, spawnIceBlocks, renderBlockInSlot, generateDockBlocks, redrawDock, registerGridCallbacks, getCellElement, trackHighlight } from './grid.js';
import { initMission, updateMissionProgress, updateMissionUI } from './missions.js';
import { Leaderboard } from './leaderboard.js';
import { updateScoreUI, addXp, syncProgressionUI, deactivateFeverMode, checkAndClearLines, saveStateSnapshot, performUndo, rerollDockBlocks, updateJokerButtonsUI, getRotatedMatrix, animateAndRotateBlock, activateFeverMode, checkGameOver, resetLevelProgression } from './mechanics.js';

let dragRAF = null;
let currentDragX = 0;
let currentDragY = 0;

export function onPointerDown(e, blockEl, shape, slotIndex) {
    if (state.isGameOver) return;
    e.preventDefault();

    state.activeDrag.blockEl = blockEl;
    state.activeDrag.shape = shape;
    state.activeDrag.slotIndex = slotIndex;
    state.activeDrag.pointerId = e.pointerId;
    state.activeDrag.originalSlot = blockEl.parentElement;
    state.activeDrag.startX = e.clientX;
    state.activeDrag.startY = e.clientY;
    state.activeDrag.startTime = Date.now();
    state.activeDrag.isDragging = false;

    const firstGridCell = gridBoard.querySelector('.grid-cell');
    state.activeDrag.gridCellSize = firstGridCell.getBoundingClientRect().width;
    state.activeDrag.gap = 6;

    // Use window for events to prevent loss of tracking during DOM manipulation
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
}

export function onPointerMove(e) {
    if (!state.activeDrag.blockEl || e.pointerId !== state.activeDrag.pointerId) return;
    const blockEl = state.activeDrag.blockEl;

    if (!state.activeDrag.isDragging) {
        const moveDist = Math.hypot(e.clientX - state.activeDrag.startX, e.clientY - state.activeDrag.startY);
        if (moveDist > 8) {
            state.activeDrag.isDragging = true;
            AudioFX.playGrab();
            
            const shape = state.activeDrag.shape;
            const cols = shape.matrix[0].length;
            const rows = shape.matrix.length;
            const targetWidth = cols * state.activeDrag.gridCellSize + (cols - 1) * state.activeDrag.gap;
            const targetHeight = rows * state.activeDrag.gridCellSize + (rows - 1) * state.activeDrag.gap;

            state.activeDrag.dragOffset = {
                x: targetWidth / 2,
                y: targetHeight / 2
            };

            blockEl.classList.remove('in-dock');
            blockEl.classList.add('dragging');

            document.body.appendChild(blockEl);
            blockEl.style.position = 'fixed';
            blockEl.style.width = `${targetWidth}px`;
            blockEl.style.height = `${targetHeight}px`;
            blockEl.style.gap = `${state.activeDrag.gap}px`;
            blockEl.style.left = '0px';
            blockEl.style.top = '0px';

            let startYOffset = 0;
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                startYOffset = -80;
            }
            const initX = e.clientX - state.activeDrag.dragOffset.x;
            const initY = e.clientY - state.activeDrag.dragOffset.y + startYOffset;

            // Compute initial transform so the block instantly snaps under the pointer
            blockEl.style.transform = `translate3d(${initX}px, ${initY}px, 0)`;
            blockEl.style.willChange = 'transform';
        } else {
            return;
        }
    }

    if (state.activeDrag.isDragging) {
        let yOffset = 0;
        // Eğer dokunmatik ekran ise, blok parmağın altında kalmasın diye "Fat Finger" offset'i uyguluyoruz (-80px)
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            yOffset = -80;
        }

        currentDragX = e.clientX - state.activeDrag.dragOffset.x;
        currentDragY = e.clientY - state.activeDrag.dragOffset.y + yOffset;

        if (!dragRAF) {
            dragRAF = requestAnimationFrame(() => {
                if (state.activeDrag.isDragging && state.activeDrag.blockEl) {
                    state.activeDrag.blockEl.style.transform = `translate3d(${currentDragX}px, ${currentDragY}px, 0)`;
                    checkPlacementValidity();
                }
                dragRAF = null;
            });
        }
    }
}

export function checkPlacementValidity() {
    const { blockEl, shape, gridCellSize, gap } = state.activeDrag;
    if (!blockEl) return;

    const blockRect = blockEl.getBoundingClientRect();
    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;

    let offsetR = null;
    let offsetC = null;

    // Reset previous highlights
    clearGridHighlights();
    state.activeDrag.targetCells = [];
    state.activeDrag.validPlacement = false;

    // Read the top-left grid cell's position ONCE to establish the board origin, then map
    // screen coordinates to grid row/col with pure arithmetic. The previous approach toggled
    // blockEl.pointerEvents and called document.elementFromPoint() for every solid cell on
    // every frame, forcing a synchronous layout recalculation each time (layout thrashing) —
    // the primary source of drag stutter on low-end phones. Same result, no forced reflow.
    const originCell = getCellElement(0, 0);
    if (!originCell) return;
    const originRect = originCell.getBoundingClientRect();
    const stride = gridCellSize + gap;

    // 1. Locate the grid cell under the first solid cell of the shape to establish the grid offset
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                // Screen-space center of this solid cell (block is rendered at its visual rect)
                const cellCenterX = blockRect.left + (c + 0.5) * stride;
                const cellCenterY = blockRect.top + (r + 0.5) * stride;

                const gridC = Math.floor((cellCenterX - originRect.left) / stride);
                const gridR = Math.floor((cellCenterY - originRect.top) / stride);

                // Only accept cells that fall on the 8x8 board
                if (gridR >= 0 && gridR < 8 && gridC >= 0 && gridC < 8) {
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

                    const cellEl = getCellElement(targetR, targetC);
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
            state.activeDrag.validPlacement = true;
            state.activeDrag.targetCells = proposedCells;
            state.activeDrag.offsetR = offsetR;
            state.activeDrag.offsetC = offsetC;

            // Apply highlight class to candidate grid cells
            proposedCells.forEach(cell => {
                cell.el.classList.add('highlight-valid');
                trackHighlight(cell.el);
            });
        } else {
            // Daha iyi preview: kısmen geçerli hücreleri yeşil, dolu olanları kırmızı göster
            proposedCells.forEach(cell => {
                if (cell.el) {
                    cell.el.classList.add('highlight-valid');
                    trackHighlight(cell.el);
                }
            });
            invalidCells.forEach(cell => {
                if (cell.el) {
                    cell.el.classList.add('highlight-invalid');
                    trackHighlight(cell.el);
                }
            });
        }
    }
}

export function onPointerUp(e) {
    if (!state.activeDrag.blockEl || e.pointerId !== state.activeDrag.pointerId) return;

    const { blockEl, shape, slotIndex, validPlacement, targetCells, originalSlot, isDragging } = state.activeDrag;

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
            // Döndürme hakkı yoksa: bloğu seç (tıkla-yerleştir akışını kullanabilsin)
            try { AudioFX.playGrab(); } catch (err) {}
            selectBlock(slotIndex);
        }
    } else {
        if (validPlacement && targetCells.length > 0) {
            AudioFX.playDrop();
            saveStateSnapshot();
            
            targetCells.forEach(cell => {
                const relativeR = cell.r - state.activeDrag.offsetR;
                const relativeC = cell.c - state.activeDrag.offsetC;
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

    state.activeDrag = {
        blockEl: null, shape: null, slotIndex: null, pointerId: null,
        dragOffset: { x: 0, y: 0 }, gridCellSize: 0, gap: 6,
        validPlacement: false, targetCells: [], originalSlot: null,
        startX: 0, startY: 0, startTime: 0, offsetR: null, offsetC: null, isDragging: false
    };
}

export function selectBlock(slotIndex) {
    deselectBlock();
    state.selectedBlockIndex = slotIndex;
    const blockEl = blockDock.querySelector(`.block-shape[data-slot-index="${slotIndex}"]`);
    if (blockEl) {
        blockEl.classList.add('selected');
    }
}

export function deselectBlock() {
    state.selectedBlockIndex = null;
    const selectedBlocks = blockDock.querySelectorAll('.block-shape.selected');
    selectedBlocks.forEach(b => b.classList.remove('selected'));
    clearGridHighlights();
}

// Find the row/col of the shape's first solid cell, used as the drag anchor point
function findShapeAnchor(shape) {
    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.matrix[r][c] === 1) {
                return { r, c };
            }
        }
    }
    return { r: 0, c: 0 };
}

export function showPreviewForSelectedBlock(gridR, gridC) {
    clearGridHighlights();
    if (state.selectedBlockIndex === null || state.isGameOver) return;
    const shape = state.dockedBlocks[state.selectedBlockIndex];
    if (!shape) return;

    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    const anchor = findShapeAnchor(shape);
    const anchorR = anchor.r, anchorC = anchor.c;

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
                const cellEl = getCellElement(targetR, targetC);
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
            if (el) {
                el.classList.add('highlight-valid');
                trackHighlight(el);
            }
        });
    } else {
        proposedCells.forEach(el => {
            if (el) {
                el.classList.add('highlight-valid');
                trackHighlight(el);
            }
        });
        invalidCells.forEach(el => {
            if (el) {
                el.classList.add('highlight-invalid');
                trackHighlight(el);
            }
        });
    }
}

export function tryPlaceSelectedBlock(gridR, gridC) {
    if (state.selectedBlockIndex === null || state.isGameOver) return;
    const shape = state.dockedBlocks[state.selectedBlockIndex];
    if (!shape) return;

    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    const anchor = findShapeAnchor(shape);

    const offsetR = gridR - anchor.r;
    const offsetC = gridC - anchor.c;

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
                const cellEl = getCellElement(targetR, targetC);
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
        addXp(shapeScore);

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

export function resetGame() {
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
registerGridCallbacks(showPreviewForSelectedBlock, tryPlaceSelectedBlock);

if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        resetGame();
    });
}

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
applyProgressResetIfNeeded();
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

const undoBtn = document.getElementById('undo-btn');
const rerollBtn = document.getElementById('reroll-btn');
const rotationRightsBtn = document.getElementById('rotation-rights-btn');

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
