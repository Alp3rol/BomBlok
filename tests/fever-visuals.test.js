import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src', 'css', 'style.css'), 'utf8');
const mechanics = readFileSync(join(root, 'src', 'js', 'mechanics.js'), 'utf8');
const particles = readFileSync(join(root, 'src', 'js', 'particles.js'), 'utf8');

test('Fever efekti blok renklerini hue-rotate ile değiştirmiyor', () => {
    assert.doesNotMatch(css, /fever-active[^{}]*\.grid-board\s*\{[^}]*hue-rotate/s);
    assert.doesNotMatch(css, /@keyframes\s+fever-bg-aurora/);
});

test('Fever ateşi hücrelerden ayrı arka katmanda çalışıyor', () => {
    assert.match(css, /\.grid-board-container::before\s*\{/);
    assert.match(css, /body\.fever-active\s+\.grid-board-container::before/);
    assert.doesNotMatch(css, /@keyframes\s+fever-flame-tongues/);
    assert.doesNotMatch(css, /body\.fever-active\s+\.grid-board-container::after/);
});

test('Fever başlangıç ve son üç saniye durumları yönetiliyor', () => {
    assert.match(mechanics, /fever-burst/);
    assert.match(mechanics, /fever-critical/);
    assert.match(mechanics, /feverTimeLeft\s*<=\s*3/);
});

test('Fever ekran vinyeti ve yükselen kor parçacıkları kullanıyor', () => {
    assert.match(css, /body\.fever-active\s+\.game-container::before/);
    assert.match(css, /@keyframes\s+fever-screen-heat/);
    assert.match(particles, /class\s+FeverEmber/);
    assert.match(particles, /class\s+FeverFlame/);
    assert.match(mechanics, /spawnFeverEmbers\(36\)/);
    assert.match(mechanics, /spawnFeverFlames\(22\)/);
});
