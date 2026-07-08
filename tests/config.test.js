import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, getDifficultyParams } from '../js/config.js';

test('getDifficultyParams defaults to level 1 for missing/invalid input', () => {
    const noArg = getDifficultyParams();
    const zero = getDifficultyParams(0);
    const negative = getDifficultyParams(-5);
    assert.equal(noArg.lvl, 1);
    assert.equal(zero.lvl, 1);
    assert.equal(negative.lvl, 1);
});

test('getDifficultyParams increases time-bomb chance as level rises, capped at 0.25', () => {
    const low = getDifficultyParams(1);
    const mid = getDifficultyParams(10);
    const high = getDifficultyParams(100);
    assert.ok(low.timeBombChance < mid.timeBombChance);
    assert.ok(mid.timeBombChance <= high.timeBombChance);
    assert.ok(high.timeBombChance <= 0.25);
});

test('getDifficultyParams lowers the time-bomb score threshold as level rises, floored at 150', () => {
    const low = getDifficultyParams(1);
    const high = getDifficultyParams(100);
    assert.ok(high.timeBombScoreThreshold < low.timeBombScoreThreshold);
    assert.ok(high.timeBombScoreThreshold >= 150);
});

test('getDifficultyParams keeps timerMax at least 2 above timerMin', () => {
    for (const level of [1, 5, 20, 50, 100]) {
        const params = getDifficultyParams(level);
        assert.ok(params.timerMax >= params.timerMin + 2, `level ${level}: timerMax should exceed timerMin by 2+`);
    }
});

test('getDifficultyParams caps iceSpawnMultiplier at 2', () => {
    const high = getDifficultyParams(200);
    assert.ok(high.iceSpawnMultiplier <= 2);
});

test('every shape in SHAPES has a valid 0/1 matrix and a color', () => {
    for (const shape of SHAPES) {
        assert.ok(Array.isArray(shape.matrix) && shape.matrix.length > 0, 'matrix must be a non-empty array');
        const width = shape.matrix[0].length;
        for (const row of shape.matrix) {
            assert.equal(row.length, width, 'all rows must share the same width');
            for (const cell of row) {
                assert.ok(cell === 0 || cell === 1, 'cells must be 0 or 1');
            }
        }
        assert.ok(shape.matrix.some(row => row.some(cell => cell === 1)), 'shape must have at least one solid cell');
        assert.equal(typeof shape.color, 'string');
    }
});
