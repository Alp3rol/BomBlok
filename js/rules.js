// Pure game-rule helpers: no DOM, no localStorage, no external state.
// Kept dependency-free on purpose so they can be unit tested directly with `node --test`.

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

    return maxCount >= 6; // 8 hücrenin en az 6'sı aynı renkse
}

// Find fully-filled rows/columns eligible for clearing on an 8x8 grid.
// All-stone lines are excluded — stone cells only break via bombs, never via line clears.
export function detectFullLines(grid) {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < 8; r++) {
        const isFull = grid[r].every(cell => cell !== 0);
        const isAllStone = grid[r].every(cell => cell === 'stone');
        if (isFull && !isAllStone) {
            rowsToClear.push(r);
        }
    }

    for (let c = 0; c < 8; c++) {
        let colFull = true;
        let allStone = true;
        for (let r = 0; r < 8; r++) {
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
