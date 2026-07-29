import { state, gridBoard, blockDock, gameOverScreen, restartBtn, helpBtn, helpModal, helpCloseBtn, modalStartBtn } from './state.js';
import { applyProgressResetIfNeeded } from './config.js';
import { AudioFX } from './audio.js';
import { ThemeManager } from './theme.js';
import { resizeCanvas, spawnParticlesAtScreen } from './particles.js';
import { initGrid, clearGridHighlights, spawnIceBlocks, renderBlockInSlot, generateDockBlocks, redrawDock, registerGridCallbacks, getCellElement, trackHighlight } from './grid.js';
import { saveRun, clearRun, restoreRun } from './run-save.js';
import { initMission, updateMissionProgress, updateMissionUI } from './missions.js';
import { Leaderboard } from './leaderboard.js';
import { updateScoreUI, addXp, syncProgressionUI, deactivateFeverMode, checkAndClearLines, saveStateSnapshot, performUndo, rerollDockBlocks, updateJokerButtonsUI, getRotatedMatrix, saveJokers } from './mechanics.js';
import { Storage, KEYS } from './storage.js';
import { Settings } from './settings.js';
import { Keyboard } from './keyboard.js';
import { createModal } from './modal.js';
import { Haptics } from './haptics.js';
import { Achievements } from './achievements.js';

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
                    const isBomb = shape.bombCell && shape.bombCell.r === r && shape.bombCell.c === c;

                    if (isOccupied) {
                        fits = false;
                        invalidCells.push({ r: targetR, c: targetC, el: cellEl, isBomb });
                    } else {
                        proposedCells.push({ r: targetR, c: targetC, el: cellEl, isBomb });
                    }
                }
            }
            if (!fits && invalidCells.length === 0) break;
        }

        const colorClass = `preview-${shape.color}`;
        if (fits) {
            state.activeDrag.validPlacement = true;
            state.activeDrag.targetCells = proposedCells;
            state.activeDrag.offsetR = offsetR;
            state.activeDrag.offsetC = offsetC;

            proposedCells.forEach(cell => {
                if (cell.el) {
                    cell.el.classList.add('preview-valid', colorClass);
                    if (cell.isBomb) cell.el.classList.add('preview-bomb');
                    trackHighlight(cell.el);
                }
            });
        } else {
            proposedCells.forEach(cell => {
                if (cell.el) {
                    cell.el.classList.add('preview-valid', colorClass);
                    if (cell.isBomb) cell.el.classList.add('preview-bomb');
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
            blockEl.remove();
            commitPlacement(shape, targetCells, state.activeDrag.offsetR, state.activeDrag.offsetC, slotIndex);
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

/**
 * Bir dock bloğunu 90° döndürür ve döndürme hakkından bir tane düşer.
 * Sürükleme yolundaki satır içi kopyadan çıkarıldı ki klavye de aynı kuralı kullansın.
 * @returns {boolean} döndürme gerçekleştiyse true (hak yoksa false)
 */
export function rotateDockBlock(slotIndex) {
    const shape = state.dockedBlocks[slotIndex];
    if (!shape || state.rotationRights <= 0) return false;

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

    const slot = document.querySelectorAll('.dock-slot')[slotIndex];
    if (slot) {
        slot.innerHTML = '';
        renderBlockInSlot(shape, slot, slotIndex);
    }
    return true;
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
                    continue;
                }
                const cellEl = getCellElement(targetR, targetC);
                const isBomb = shape.bombCell && shape.bombCell.r === r && shape.bombCell.c === c;
                if (state.grid[targetR][targetC] !== 0) {
                    fits = false;
                    invalidCells.push({ el: cellEl, isBomb });
                } else {
                    proposedCells.push({ el: cellEl, isBomb });
                }
            }
        }
    }

    const colorClass = `preview-${shape.color}`;
    if (fits) {
        proposedCells.forEach(item => {
            if (item.el) {
                item.el.classList.add('preview-valid', colorClass);
                if (item.isBomb) item.el.classList.add('preview-bomb');
                trackHighlight(item.el);
            }
        });
    } else {
        proposedCells.forEach(item => {
            if (item.el) {
                item.el.classList.add('preview-valid', colorClass);
                if (item.isBomb) item.el.classList.add('preview-bomb');
                trackHighlight(item.el);
            }
        });
        invalidCells.forEach(item => {
            if (item.el) {
                item.el.classList.add('highlight-invalid');
                trackHighlight(item.el);
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
        const slotIndex = state.selectedBlockIndex;
        const blockEl = blockDock.querySelector(`.block-shape[data-slot-index="${slotIndex}"]`);
        if (blockEl) blockEl.remove();
        commitPlacement(shape, proposedCells, offsetR, offsetC, slotIndex);
    } else {
        AudioFX.playBuzzer();
    }
}

/**
 * Bir şekli tahtaya yazar, puanlar ve turu ilerletir.
 *
 * Sürükle-bırak ve tıkla-yerleştir akışları bu bloğun neredeyse birebir aynısını ayrı ayrı
 * taşıyordu. İki kopya zamanla ayrıştı: tıklama yolu snapshot'ı mutasyondan sonra ikinci kez
 * alıp Geri Al'ı işlevsiz bırakmıştı. Tek yol bırakarak o sınıf hatayı yapısal olarak kapatıyoruz.
 *
 * Snapshot BURADA ve yalnızca bir kez, tahtaya dokunmadan önce alınır.
 *
 * @param {{matrix:(0|1)[][], color:string, bombCell?:{r:number,c:number}}} shape
 * @param {{r:number, c:number, el:HTMLElement}[]} cells Yerleştirilecek hücreler
 * @param {number} offsetR Şekil matrisinin tahtadaki satır kaydırması
 * @param {number} offsetC Şekil matrisinin tahtadaki sütun kaydırması
 * @param {number} slotIndex Boşaltılacak dock yuvası
 */
function commitPlacement(shape, cells, offsetR, offsetC, slotIndex) {
    saveStateSnapshot();

    for (const cell of cells) {
        const isBomb = !!shape.bombCell
            && shape.bombCell.r === cell.r - offsetR
            && shape.bombCell.c === cell.c - offsetC;

        state.grid[cell.r][cell.c] = isBomb ? `${shape.color}-bomb` : shape.color;

        cell.el.classList.add('filled', `filled-${shape.color}`);
        if (isBomb) cell.el.classList.add('bomb');
    }

    // Yerleştirme puanı: dolan hücre başına 1, Fever Mode'da iki katı.
    const gained = state.isFeverActive ? cells.length * 2 : cells.length;
    state.score += gained;
    updateMissionProgress('points', gained);
    updateMissionProgress('blocks', 1);
    updateScoreUI();
    addXp(gained);

    state.dockedBlocks[slotIndex] = null;

    AudioFX.playDrop();
    Haptics.vibrateDrop();
    checkAndClearLines();

    if (state.dockedBlocks.every(b => b === null)) generateDockBlocks();
    updateJokerButtonsUI();
}

export function resetGame() {
    clearRun();
    state.grid = Array(8).fill(null).map(() => Array(8).fill(0));
    state.timeBombs = [];
    state.score = 0;
    state.comboCount = 0;
    state.rotationRights = 0;
    state.isGameOver = false;
    state.previousState = null;
    state.undoUsedThisGame = false;
    state.rerollUsedThisGame = false;
    // Bunlar sıfırlanmadığı için önceki turun sayaçları yeni tura sızıyordu.
    state.movesSinceClear = 0;
    state.consecutiveClears = 0;
    deactivateFeverMode();
    initMission();
    deselectBlock();
    closeGameOverDialog();
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

// Oyun bitti ekranı: BİLEREK kapatılamaz (dismissible: false). Escape veya arka plana
// tıklayarak kapatılabilseydi oyuncu, hiçbir hamlenin mümkün olmadığı ölü bir tahtada,
// yeniden başlama yolu görünmeden mahsur kalırdı.
// Odak metin kutusuna değil butona veriliyor: mobilde otomatik açılan klavye ekranın
// yarısını kapatırdı.
const gameOverDialog = createModal(gameOverScreen, {
    labelledBy: 'game-over-title',
    dismissible: false,
    initialFocus: () => {
        const save = document.getElementById('game-over-save-btn');
        return save && !save.disabled ? save : restartBtn;
    }
});

export function openGameOverDialog() {
    if (gameOverDialog) gameOverDialog.open(null);
}

export function closeGameOverDialog() {
    if (gameOverDialog) gameOverDialog.close();
}

// Help Modal — diyalog semantiği, Escape, arka plan tıklaması, odak tuzağı ve odak
// geri dönüşü ortak yardımcıdan geliyor.
const helpDialog = createModal(helpModal, { labelledBy: 'help-title' });

if (helpBtn && helpDialog) {
    helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.init();
        AudioFX.playGrab();
        helpDialog.open(helpBtn);
    });
}

[helpCloseBtn, modalStartBtn].forEach((btn) => {
    if (!btn || !helpDialog) return;
    btn.addEventListener('click', () => {
        AudioFX.init();
        AudioFX.playGrab();
        helpDialog.close();
    });
});

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
Settings.init();
Leaderboard.init();
syncProgressionUI();

// Yarım kalan tur varsa kaldığı yerden devam et. Kayıt bozuk/eski şemalıysa restoreRun
// false döner ve normal yeni oyun akışına düşeriz.
const resumed = restoreRun();

if (!resumed) {
    state.grid = Array(8).fill(null).map(() => Array(8).fill(0));
    spawnIceBlocks(); // Spawn initial ice blocks
}

initGrid();
resizeCanvas(); // Align canvas size to grid

if (resumed) {
    redrawDock(); // Kaydedilmiş şekilleri yerine koy
} else {
    generateDockBlocks();
}

if (state.currentMission) {
    updateMissionUI(); // Geri yüklenen görev ilerlemesini göster
} else {
    initMission(); // Initialize first mission!
}

updateScoreUI();
updateJokerButtonsUI(); // Set initial button states

Keyboard.init({
    selectBlock,
    deselectBlock,
    showPreview: showPreviewForSelectedBlock,
    tryPlace: tryPlaceSelectedBlock,
    rotateDockBlock
});

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
            saveJokers();
            state.rotationRights += 1;
            
            updateMissionProgress('rotate', 1);
            
            updateScoreUI();
            updateJokerButtonsUI();
            updateMissionUI();
            saveRun();
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

// Share score button listener
const shareBtn = document.getElementById('share-score-btn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const shareText = `💣 BomBlok | Skor: ${state.score.toLocaleString()}\n🏆 Seviye: ${state.playerLevel}\n🟪🟪🟨🟨💣🧊🟩🟩\n🎮 Sen de oyna: ${window.location.href}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'BomBlok Skorum', text: shareText, url: window.location.href });
            } catch (err) {}
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                Achievements.showToast('🚀 Skor Kartı Panoya Kopyalandı!');
            } catch (err) {}
        }
    });
}

// PWA Install prompt listener
let deferredPrompt = null;
const pwaBanner = document.getElementById('pwa-install-banner');
const pwaInstallBtn = document.getElementById('pwa-install-btn');
const pwaCloseBtn = document.getElementById('pwa-close-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaBanner && !Storage.get(KEYS.pwaDismissed)) {
        pwaBanner.classList.remove('hidden');
    }
});

if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            // Prompt tek kullanımlık: kullanıcı kabul de etse reddetse de aynı event
            // nesnesi bir daha kullanılamaz, o yüzden sonucuna bakmadan düşürüyoruz.
            deferredPrompt = null;
            if (pwaBanner) pwaBanner.classList.add('hidden');
        }
    });
}
if (pwaCloseBtn) {
    pwaCloseBtn.addEventListener('click', () => {
        if (pwaBanner) pwaBanner.classList.add('hidden');
        Storage.set(KEYS.pwaDismissed, 'true');
    });
}
