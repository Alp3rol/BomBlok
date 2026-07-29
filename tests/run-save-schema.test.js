import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA, isValidSave, isValidGrid, isValidShape } from '../js/run-save-schema.js';

// Kabul edilen bozuk bir kayıt oyunu AÇILIŞTA kilitler — kullanıcının kurtulma yolu yok.
// Bu yüzden doğrulama varsayılan olarak reddetmeli.

function bosGrid() {
    return Array.from({ length: 8 }, () => Array(8).fill(0));
}

function gecerliKayit(ustuneYaz = {}) {
    return {
        schema: SCHEMA,
        grid: bosGrid(),
        dockedBlocks: [{ matrix: [[1, 1]], color: 'blue' }, null, null],
        timeBombs: [],
        score: 42,
        ...ustuneYaz
    };
}

test('geçerli kayıt kabul edilir', () => {
    assert.equal(isValidSave(gecerliKayit()), true);
});

test('null / undefined / ilkel değerler reddedilir', () => {
    for (const v of [null, undefined, 0, '', 'kayit', 42, true, []]) {
        assert.equal(isValidSave(v), false, `${JSON.stringify(v)} reddedilmeliydi`);
    }
});

test('farklı şema sürümü reddedilir', () => {
    assert.equal(isValidSave(gecerliKayit({ schema: SCHEMA + 1 })), false);
    assert.equal(isValidSave(gecerliKayit({ schema: undefined })), false);
});

test('8x8 olmayan tahta reddedilir', () => {
    assert.equal(isValidGrid(bosGrid()), true);
    assert.equal(isValidGrid(Array.from({ length: 7 }, () => Array(8).fill(0))), false, '7 satır');
    assert.equal(isValidGrid(Array.from({ length: 8 }, () => Array(7).fill(0))), false, '7 sütun');
    assert.equal(isValidGrid('grid'), false);
    assert.equal(isValidGrid(null), false);
});

test('tanınmayan hücre tipi taşıyan tahta reddedilir', () => {
    const g = bosGrid();
    g[2][3] = { nesne: true };
    assert.equal(isValidGrid(g), false);

    const g2 = bosGrid();
    g2[0][0] = 7;
    assert.equal(isValidGrid(g2), false, 'sayı hücre olamaz (0 hariç)');
});

test('dock tam olarak 3 yuva içermeli', () => {
    assert.equal(isValidSave(gecerliKayit({ dockedBlocks: [null, null] })), false);
    assert.equal(isValidSave(gecerliKayit({ dockedBlocks: [] })), false);
    assert.equal(isValidSave(gecerliKayit({ dockedBlocks: 'abc' })), false);
});

test('tamamen boş dock geri yüklenecek tur sayılmaz', () => {
    assert.equal(isValidSave(gecerliKayit({ dockedBlocks: [null, null, null] })), false);
});

test('boş yuva (null) geçerli bir şekildir', () => {
    assert.equal(isValidShape(null), true);
});

test('bozuk şekiller reddedilir', () => {
    assert.equal(isValidShape({ color: 'blue' }), false, 'matrix yok');
    assert.equal(isValidShape({ matrix: [], color: 'blue' }), false, 'boş matris');
    assert.equal(isValidShape({ matrix: [[]], color: 'blue' }), false, 'sıfır genişlik');
    assert.equal(isValidShape({ matrix: [[0, 0]], color: 'blue' }), false, 'hiç dolu hücre yok');
    assert.equal(isValidShape({ matrix: [[1, 1], [1]], color: 'blue' }), false, 'düzensiz satır genişliği');
    assert.equal(isValidShape({ matrix: [[1, 2]], color: 'blue' }), false, '0/1 dışı değer');
    assert.equal(isValidShape({ matrix: [[1]] }), false, 'renk yok');
});

test('geçerli şekil kabul edilir', () => {
    assert.equal(isValidShape({ matrix: [[1, 0], [1, 1]], color: 'cyan' }), true);
});

test('geçersiz skor reddedilir', () => {
    assert.equal(isValidSave(gecerliKayit({ score: -1 })), false, 'negatif');
    assert.equal(isValidSave(gecerliKayit({ score: NaN })), false);
    assert.equal(isValidSave(gecerliKayit({ score: Infinity })), false);
    assert.equal(isValidSave(gecerliKayit({ score: '100' })), false, 'string skor');
    assert.equal(isValidSave(gecerliKayit({ score: 0 })), true, '0 geçerli bir skor');
});

test('timeBombs dizi olmalı', () => {
    assert.equal(isValidSave(gecerliKayit({ timeBombs: undefined })), false);
    assert.equal(isValidSave(gecerliKayit({ timeBombs: {} })), false);
});
