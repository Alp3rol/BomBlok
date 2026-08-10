import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'public', 'index.html'), 'utf8');
const themeSource = readFileSync(join(root, 'src', 'js', 'theme.js'), 'utf8');
const themesCss = readFileSync(join(root, 'src', 'css', 'themes.css'), 'utf8');

test('ilk açılışta Standart tema kullanılıyor', () => {
    assert.match(html, /<body class="theme-standard">/);
    assert.match(themeSource, /Storage\.get\(KEYS\.theme, 'standard'\)/);
});

test('Standart tema menüde ve tema sisteminde tanımlı', () => {
    assert.match(html, /data-theme="standard"/);
    assert.match(themeSource, /standard:\s*\{[^}]*name:\s*'Standart'/);
    assert.match(themesCss, /body\.theme-standard\s*\{/);
});
