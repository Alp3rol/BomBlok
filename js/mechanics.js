import { state, gridBoard, currentScoreEl, bestScoreEl, blockDock, gameOverScreen, finalScoreEl, feverBanner, feverBarFill, playerLevelEl, xpBarFillEl, xpTextEl } from './state.js';
import { getDifficultyParams, COLOR_MAP } from './config.js';
import { AudioFX } from './audio.js';
import { spawnParticles, spawnParticlesAtScreen } from './particles.js';
import { initGrid, clearGridHighlights, renderBlockInSlot, generateDockBlocks, redrawDock, generateRandomShape, getCellElement } from './grid.js';
import { getRotatedMatrix, checkColorMatch, detectFullLines } from './rules.js';
import { initMission, updateMissionProgress, updateMissionUI, checkMissionConstraints } from './missions.js';
import { Leaderboard } from './leaderboard.js';
import { selectBlock, deselectBlock } from './main.js';

let shakeTimeoutId = null;
let activePopups = 0;

export function activateFeverMode() {
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

export function deactivateFeverMode() {
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

export function triggerScreenShake(intensity) {
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

export function showComboPopup(linesCleared, comboCount, isCrossClear = false) {
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

export { checkColorMatch };

export function showFloatingText(text, color = '#00e5ff') {
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

export function spawnTimeBomb(force = false) {
    const diff = getDifficultyParams(state.level);
    if (!force) {
        if (state.score < diff.timeBombScoreThreshold) return;
        if (Math.random() > diff.timeBombChance) return;
    }
    
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
        
        const cellEl = getCellElement(randCell.r, randCell.c);
        if (cellEl) {
            cellEl.className = 'grid-cell filled filled-timebomb ice-spawn-anim';
            cellEl.dataset.timer = timer;
            setTimeout(() => { cellEl.classList.remove('ice-spawn-anim'); }, 500);
        }
        try { AudioFX.playBuzzer(); } catch(e) {}
    }
}

export function tickTimeBombs() {
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
        
        const cellEl = getCellElement(bomb.r, bomb.c);
        if (cellEl) {
            cellEl.dataset.timer = bomb.timer;
        }
        
        if (bomb.timer <= 0) {
            explodeTimeBomb(bomb.r, bomb.c);
            state.timeBombs.splice(i, 1);
        }
    }
}

export function explodeTimeBomb(bombR, bombC) {
    try { AudioFX.playBomb(); } catch(e) {}
    triggerScreenShake('heavy');
    
    // O satırı komple taşa çevir
    for (let c = 0; c < 8; c++) {
        state.grid[bombR][c] = 'stone';
        spawnParticles(bombR, c, 'gray');
        const cellEl = getCellElement(bombR, c);
        if (cellEl) {
            cellEl.className = 'grid-cell filled filled-stone';
        }
    }
    showFloatingText("BOMBA PATLADI!", "#ff0044");
}

export function checkAndClearLines() {
    state.missionMoves++;
    let iceBrokenThisMove = 0;
    let bombsExplodedThisMove = 0;

    const { rowsToClear, colsToClear } = detectFullLines(state.grid);

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
        // Obstacle cells (ice/stone) broken by bomb chains are collected here instead of being
        // animated inline, so all particle-position reads happen before any class-list writes —
        // interleaving reads/writes per cell forces a synchronous layout recalculation on every
        // iteration ("layout thrashing"), which is a major stutter source on low-end phones.
        const brokenObstacles = [];

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
                                    updateMissionProgress('ice', 1); // Track ice broken by bomb
                                    iceBrokenThisMove++;
                                    brokenObstacles.push({ r: nr, c: nc, particleColor: 'cyan' });
                                } else if (cellColor === 'stone') {
                                    // Break stone block with bomb
                                    state.grid[nr][nc] = 0;
                                    updateMissionProgress('stone', 1);
                                    brokenObstacles.push({ r: nr, c: nc, particleColor: 'gray' });
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

        // Batch all reads (particle position lookups) before any writes (class-list changes)
        // to avoid forcing a synchronous layout recalculation on every obstacle cell.
        brokenObstacles.forEach(o => spawnParticles(o.r, o.c, o.particleColor));
        brokenObstacles.forEach(o => {
            const cellEl = getCellElement(o.r, o.c);
            if (cellEl) {
                cellEl.classList.add('blasting');
                setTimeout(() => {
                    cellEl.style.transition = 'none';
                    cellEl.className = 'grid-cell';
                    requestAnimationFrame(() => requestAnimationFrame(() => cellEl.style.transition = ''));
                }, 400);
            }
        });

        if (hasBombExploded) {
            AudioFX.playBomb();
            triggerScreenShake('heavy'); // Ensure heavy screen shake on bomb explosion
            activateFeverMode(); // Bomb explosion triggers/extends Fever Mode!
        }

        // 2. Melt ice blocks adjacent to cleared rows/cols
        const meltedIceCells = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (state.grid[r][c] === 'ice') {
                    const isAdjacentRow = rowsToClear.some(rowIdx => Math.abs(r - rowIdx) <= 1);
                    const isAdjacentCol = colsToClear.some(colIdx => Math.abs(c - colIdx) <= 1);

                    if (isAdjacentRow || isAdjacentCol) {
                        state.grid[r][c] = 0;
                        updateMissionProgress('ice', 1); // Track ice broken by adjacent clear
                        iceBrokenThisMove++;
                        meltedIceCells.push({ r, c });
                    }
                }
            }
        }

        // Batch reads (particle position lookups) before writes (class-list changes) — see note above.
        meltedIceCells.forEach(cell => spawnParticles(cell.r, cell.c, 'cyan'));
        meltedIceCells.forEach(cell => {
            const cellEl = getCellElement(cell.r, cell.c);
            if (cellEl) {
                cellEl.classList.add('blasting');
                setTimeout(() => {
                    cellEl.style.transition = 'none';
                    if (state.grid[cell.r][cell.c] === 0) {
                        cellEl.className = 'grid-cell';
                    } else {
                        cellEl.classList.remove('blasting', 'filled-ice');
                    }
                    requestAnimationFrame(() => requestAnimationFrame(() => cellEl.style.transition = ''));
                }, 400);
            }
        });

        // Trigger particle blast for each cell
        const particleMultiplier = state.isFeverActive ? 2.5 : (1 + state.comboCount * 0.2);
        cellsToClear.forEach(cell => {
            const colorName = typeof cell.color === 'string' ? cell.color.split('-')[0] : 'orange';
            spawnParticles(cell.r, cell.c, colorName, particleMultiplier);
        });

        // Mark cells as empty in grid state immediately to allow placements
        cellsToClear.forEach(cell => {
            state.grid[cell.r][cell.c] = 0;
        });

        // Play CSS animation on grid cell elements
        cellsToClear.forEach(cell => {
            const cellEl = getCellElement(cell.r, cell.c);
            if (cellEl) {
                cellEl.classList.add('blasting');
            }
        });

        // Clean classes and styles from DOM after animation completes (400ms)
        setTimeout(() => {
            cellsToClear.forEach(cell => {
                const cellEl = getCellElement(cell.r, cell.c);
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
                const diff = getDifficultyParams(state.level);
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
                        
                        const cellEl = getCellElement(randCell.r, randCell.c);
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

            if (mType === 'tetrisefsanesi' && state.activeDrag && state.activeDrag.shape) {
                const rCount = state.activeDrag.shape.matrix.length;
                const cCount = state.activeDrag.shape.matrix[0].length;
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

export function endTurn() {
    tickTimeBombs();
    spawnTimeBomb();
    checkGameOver();
}

export { getRotatedMatrix };

export function canShapeFit(shape) {
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

export function canShapeFitWithRotation(shape) {
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

export function checkGameOver() {
    // Collect active blocks remaining in the dock
    const activeBlocks = state.dockedBlocks.filter(block => block !== null);

    // If no blocks are remaining in the dock, they will be regenerated shortly
    if (activeBlocks.length === 0) return;

    // Check if at least one remaining block can fit (with rotation if rights > 0)
    const anyBlockFits = activeBlocks.some(shape => canShapeFitWithRotation(shape));

    if (!anyBlockFits) {
        state.isGameOver = true;
        deactivateFeverMode();
        resetLevelProgression();

        // Play game over tune
        AudioFX.playGameOver();

        // Show Game Over UI after a small delay
        setTimeout(() => {
            finalScoreEl.textContent = state.score;
            gameOverScreen.classList.remove('hidden');
            if (typeof Leaderboard !== 'undefined' && Leaderboard.prepareGameOverUI) {
                Leaderboard.prepareGameOverUI();
            }
        }, 600);

        console.log('Game Over! No shapes can fit.');
        updateJokerButtonsUI();
    }
}

export function updateScoreUI() {
    currentScoreEl.textContent = state.score;
    bestScoreEl.textContent = state.bestScore;
    const rotRightsEl = document.getElementById('rotation-rights');
    if (rotRightsEl) {
        rotRightsEl.textContent = state.rotationRights;
    }
}

export function getXpToNext(level) {
    // Basit eğri: her seviye biraz daha fazla XP ister
    return 120 + (level - 1) * 60;
}

export function syncProgressionUI() {
    const lvl = Math.max(1, state.level || 1);
    const xpNeeded = getXpToNext(lvl);
    const xp = Math.max(0, state.xp || 0);
    const pct = xpNeeded > 0 ? Math.min(100, (xp / xpNeeded) * 100) : 0;

    if (playerLevelEl) playerLevelEl.textContent = String(lvl);
    if (xpBarFillEl) xpBarFillEl.style.width = `${pct}%`;
    if (xpTextEl) xpTextEl.textContent = `${xp}/${xpNeeded} XP`;
}

export function saveProgression() {
    localStorage.setItem('bomblok_level', String(state.level));
    localStorage.setItem('bomblok_xp', String(state.xp));
}

export function resetLevelProgression() {
    state.level = 1;
    state.xp = 0;
    state.jokers = 0;
    saveProgression();
    localStorage.setItem('bomblok_jokers', '0');
    syncProgressionUI();
    updateJokerButtonsUI();
}

export function addXp(amount) {
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

export function saveStateSnapshot() {
    state.previousState = {
        grid: state.grid.map(row => row.slice()),
        dockedBlocks: state.dockedBlocks.map(b => b ? { ...b, matrix: b.matrix.map(r => r.slice()) } : null),
        timeBombs: state.timeBombs.map(b => ({ ...b })),
        score: state.score,
        comboCount: state.comboCount,
        rotationRights: state.rotationRights,
        isFeverActive: state.isFeverActive,
        feverTimeLeft: state.feverTimeLeft,
        currentMission: state.currentMission ? { ...state.currentMission } : null
    };
}

export function updateJokerButtonsUI() {
    const jokerCountEl = document.getElementById('joker-count');
    if (jokerCountEl) jokerCountEl.textContent = state.jokers;

    const undoBtn = document.getElementById('undo-btn');
    const rerollBtn = document.getElementById('reroll-btn');
    const rotationRightsBtn = document.getElementById('rotation-rights-btn');

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

export function performUndo() {
    if (!state.previousState || state.jokers <= 0 || state.undoUsedThisGame) return;

    // Deduct joker
    state.jokers--;
    localStorage.setItem('bomblok_jokers', state.jokers);
    state.undoUsedThisGame = true;

    // Restore state
    const prev = state.previousState;
    state.grid = prev.grid;
    state.dockedBlocks = prev.dockedBlocks;
    state.timeBombs = prev.timeBombs ? structuredClone(prev.timeBombs) : [];
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

export function rerollDockBlocks() {
    if (state.jokers <= 0 || state.rerollUsedThisGame) return;

    // Deduct joker
    state.jokers--;
    localStorage.setItem('bomblok_jokers', state.jokers);
    state.rerollUsedThisGame = true;

    // Generate new blocks for remaining slots
    state.dockedBlocks.forEach((block, index) => {
        if (block !== null) {
            state.dockedBlocks[index] = generateRandomShape();
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

export function animateAndRotateBlock(slotIndex, shape) {
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
