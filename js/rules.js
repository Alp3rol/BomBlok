// Pure game-rule helpers: no DOM, no localStorage, no external state.
// Kept dependency-free on purpose so they can be unit tested directly with `node --test`.
// (constants.js is itself dependency-free, so importing it keeps that property.)

import { GRID } from './constants.js';

// Rotate a shape matrix 90 degrees clockwise
export function getRotatedMatrix(matrix) {
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

// Returns whether a shape matrix can be placed anywhere on the supplied grid.
// Keeping this rule independent from UI state lets game-over checks use exactly
// the same occupied-cell semantics as placement and makes edge cases testable.
export function canMatrixFit(grid, matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) return false;

    const rows = matrix.length;
    const cols = matrix[0].length;
    for (let startR = 0; startR <= GRID - rows; startR++) {
        for (let startC = 0; startC <= GRID - cols; startC++) {
            let fits = true;
            for (let r = 0; r < rows && fits; r++) {
                for (let c = 0; c < cols; c++) {
                    if (matrix[r][c] === 1 && grid[startR + r][startC + c] !== 0) {
                        fits = false;
                        break;
                    }
                }
            }
            if (fits) return true;
        }
    }
    return false;
}

// Rotation is clockwise and each quarter-turn consumes one right. Do not treat
// a 180/270-degree fit as playable when the player can only afford one turn.
export function canMatrixFitWithinTurns(grid, matrix, availableTurns = 0) {
    let candidate = matrix;
    const turnsToTry = Math.min(3, Math.max(0, Math.floor(availableTurns)));
    for (let turns = 0; turns <= turnsToTry; turns++) {
        if (canMatrixFit(grid, candidate)) return true;
        candidate = getRotatedMatrix(candidate);
    }
    return false;
}

// A line (row or column) counts as a "color match" when at least 6 of its 8 cells
// share the same base color (bomb-suffixed colors like 'blue-bomb' count as 'blue').
export function checkColorMatch(lineCells) {
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

    // Satırın neredeyse tamamı aynı renk olmalı: 8 hücrede 6. Eşik GRID'e bağlı yazıldı,
    // aksi halde tahta boyutu değişse kural sessizce anlamını yitirirdi.
    return maxCount >= GRID - 2;
}

// Find fully-filled rows/columns eligible for clearing on an 8x8 grid.
// All-stone lines are excluded — stone cells only break via bombs, never via line clears.
export function detectFullLines(grid) {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < GRID; r++) {
        const isFull = grid[r].every(cell => cell !== 0);
        const isAllStone = grid[r].every(cell => cell === 'stone');
        if (isFull && !isAllStone) {
            rowsToClear.push(r);
        }
    }

    for (let c = 0; c < GRID; c++) {
        let colFull = true;
        let allStone = true;
        for (let r = 0; r < GRID; r++) {
            if (grid[r][c] === 0) {
                colFull = false;
                break;
            }
            if (grid[r][c] !== 'stone') {
                allStone = false;
            }
        }
        if (colFull && !allStone) {
            colsToClear.push(c);
        }
    }

    return { rowsToClear, colsToClear };
}
