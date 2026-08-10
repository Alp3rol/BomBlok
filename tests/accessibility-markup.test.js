import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'public', 'index.html'), 'utf8');

test('yalnız ikon içeren ana kontrol butonlarının erişilebilir adı var', () => {
    for (const id of ['pwa-close-btn', 'leaderboard-btn', 'help-btn', 'help-close-btn', 'leaderboard-close-btn']) {
        const button = html.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`, 'i'))?.[0];
        assert.ok(button, `${id} butonu bulunamadı`);
        assert.match(button, /aria-label=["'][^"']+["']/i, `${id} için aria-label eksik`);
    }
});

test('ana modallar statik olarak dialog semantiğine sahip', () => {
    for (const id of ['game-over-screen', 'help-modal', 'leaderboard-modal']) {
        const element = html.match(new RegExp(`<div[^>]*id=["']${id}["'][^>]*>`, 'i'))?.[0];
        assert.ok(element, `${id} bulunamadı`);
        assert.match(element, /role=["']dialog["']/i, `${id} role=dialog taşımıyor`);
        assert.match(element, /aria-modal=["']true["']/i, `${id} aria-modal=true taşımıyor`);
        assert.match(element, /aria-labelledby=["'][^"']+["']/i, `${id} aria-labelledby taşımıyor`);
    }
});

test('HTML güvenlik politikası tanımlı ve inline script içermiyor', () => {
    assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
    assert.match(html, /object-src 'none'/i);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i);
});
