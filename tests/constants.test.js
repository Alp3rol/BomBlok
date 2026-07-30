import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRID, LAST, inBounds } from '../js/constants.js';

test('GRID pozitif bir tam sayı ve LAST onunla tutarlı', () => {
    assert.ok(Number.isInteger(GRID) && GRID > 0);
    assert.equal(LAST, GRID - 1);
});

test('inBounds tahtanın içindeki koordinatları kabul eder', () => {
    assert.equal(inBounds(0, 0), true);
    assert.equal(inBounds(LAST, LAST), true);
    assert.equal(inBounds(0, LAST), true);
    assert.equal(inBounds(LAST, 0), true);
    assert.equal(inBounds(Math.floor(GRID / 2), Math.floor(GRID / 2)), true);
});

test('inBounds kenarın bir adım dışını reddeder', () => {
    // Sınır kontrolleri elle yazılırken en sık burada hata yapılıyor.
    assert.equal(inBounds(-1, 0), false);
    assert.equal(inBounds(0, -1), false);
    assert.equal(inBounds(GRID, 0), false);
    assert.equal(inBounds(0, GRID), false);
    assert.equal(inBounds(GRID, GRID), false);
});

test('kaydedilmiş tur doğrulaması aynı GRID değerini kullanıyor', async () => {
    // run-save-schema.js kendi `const GRID = 8` kopyasını taşıyordu; ikisi ayrışırsa
    // geçerli kayıtlar reddedilmeye (veya bozuk kayıtlar kabul edilmeye) başlar.
    const { isValidGrid } = await import('../js/run-save-schema.js');
    const dogruBoyut = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    const yanlisBoyut = Array.from({ length: GRID + 1 }, () => Array(GRID).fill(0));
    assert.equal(isValidGrid(dogruBoyut), true);
    assert.equal(isValidGrid(yanlisBoyut), false);
});

test('renk eşleşme eşiği GRID ile ölçekleniyor', async () => {
    const { checkColorMatch } = await import('../js/rules.js');
    // Tam GRID-2 tane aynı renk: eşiği karşılar.
    const yeterli = Array(GRID).fill(0);
    for (let i = 0; i < GRID - 2; i++) yeterli[i] = 'blue';
    assert.equal(checkColorMatch(yeterli), true);

    // Bir eksik: karşılamaz.
    const yetersiz = Array(GRID).fill(0);
    for (let i = 0; i < GRID - 3; i++) yetersiz[i] = 'blue';
    assert.equal(checkColorMatch(yetersiz), false);
});
