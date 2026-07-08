import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRotatedMatrix, checkColorMatch, detectFullLines } from '../js/rules.js';

function emptyGrid() {
    return Array.from({ length: 8 }, () => Array(8).fill(0));
}

test('getRotatedMatrix rotates a rectangular shape 90deg clockwise', () => {
    // I-piece lying flat: 1 row x 3 cols
    const flat = [[1, 1, 1]];
    const rotated = getRotatedMatrix(flat);
    assert.deepEqual(rotated, [[1], [1], [1]]);
});

test('getRotatedMatrix rotating four times returns the original matrix', () => {
    const lShape = [[1, 0], [1, 1]];
    let current = lShape;
    for (let i = 0; i < 4; i++) {
        current = getRotatedMatrix(current);
    }
    assert.deepEqual(current, lShape);
});

test('checkColorMatch is true when 6+ of 8 cells share a base color', () => {
    const line = ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'green', 0];
    assert.equal(checkColorMatch(line), true);
});

test('checkColorMatch treats bomb-suffixed cells as their base color', () => {
    const line = ['blue-bomb', 'blue', 'blue', 'blue', 'blue', 'blue', 0, 'green'];
    assert.equal(checkColorMatch(line), true);
});

test('checkColorMatch ignores empty and ice cells when counting', () => {
    const line = ['red', 'red', 'red', 'red', 'red', 0, 'ice', 'ice'];
    // Only 5 red cells among non-empty/non-ice — below the 6-cell threshold
    assert.equal(checkColorMatch(line), false);
});

test('checkColorMatch is false when no color has 6+ occurrences', () => {
    const line = ['red', 'red', 'blue', 'blue', 'green', 'green', 'yellow', 'purple'];
    assert.equal(checkColorMatch(line), false);
});

test('detectFullLines finds no lines on an empty grid', () => {
    const grid = emptyGrid();
    const { rowsToClear, colsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, []);
    assert.deepEqual(colsToClear, []);
});

test('detectFullLines finds a fully-filled row', () => {
    const grid = emptyGrid();
    grid[3] = Array(8).fill('blue');
    const { rowsToClear, colsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, [3]);
    assert.deepEqual(colsToClear, []);
});

test('detectFullLines finds a fully-filled column', () => {
    const grid = emptyGrid();
    for (let r = 0; r < 8; r++) grid[r][5] = 'orange';
    const { rowsToClear, colsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, []);
    assert.deepEqual(colsToClear, [5]);
});

test('detectFullLines detects a cross-clear (row and column at once)', () => {
    const grid = emptyGrid();
    grid[0] = Array(8).fill('green');
    for (let r = 0; r < 8; r++) grid[r][0] = 'green';
    const { rowsToClear, colsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, [0]);
    assert.deepEqual(colsToClear, [0]);
});

test('detectFullLines excludes an all-stone row (stone only breaks via bombs)', () => {
    const grid = emptyGrid();
    grid[2] = Array(8).fill('stone');
    const { rowsToClear, colsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, []);
    assert.deepEqual(colsToClear, []);
});

test('detectFullLines still clears a row that is full but not entirely stone', () => {
    const grid = emptyGrid();
    grid[4] = Array(8).fill('stone');
    grid[4][0] = 'blue'; // one non-stone cell keeps it eligible for clearing
    const { rowsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, [4]);
});

test('detectFullLines does not clear a row with any empty cell', () => {
    const grid = emptyGrid();
    grid[6] = Array(8).fill('blue');
    grid[6][7] = 0;
    const { rowsToClear } = detectFullLines(grid);
    assert.deepEqual(rowsToClear, []);
});
