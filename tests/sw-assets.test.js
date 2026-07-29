import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// sw.js'teki CORE_ASSETS listesi elle tutuluyor ve js/ klasöründen kolayca sapıyor —
// storage.js eklendiğinde listeye yazılmayı bir tur atlamıştı. Bu testler listeyi
// gerçek dosya sistemine bağlar, böylece sapma CI'da yakalanır.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swSource = readFileSync(join(root, 'sw.js'), 'utf8');

function coreAssets() {
    const block = swSource.match(/const CORE_ASSETS = \[([\s\S]*?)\];/);
    assert.ok(block, 'sw.js içinde CORE_ASSETS dizisi bulunamadı');
    return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('CORE_ASSETS js/ altındaki her modülü içeriyor', () => {
    const onDisk = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).sort();
    const listed = coreAssets()
        .filter((p) => p.startsWith('./js/'))
        .map((p) => p.replace('./js/', ''))
        .sort();

    const eksik = onDisk.filter((f) => !listed.includes(f));
    assert.deepEqual(eksik, [], `sw.js CORE_ASSETS listesine eklenmemiş modül(ler): ${eksik.join(', ')}`);
});

test('CORE_ASSETS içindeki her yol gerçekten var olan bir dosyaya işaret ediyor', () => {
    const eksik = coreAssets()
        .filter((p) => p !== './')          // kök gezinme girişi, dosya değil
        .filter((p) => !existsSync(join(root, p.replace('./', ''))));

    assert.deepEqual(eksik, [], `sw.js var olmayan dosyaları önbelleğe almaya çalışıyor: ${eksik.join(', ')}`);
});

test('service worker sürümü sabit bir biçimde tanımlı', () => {
    const version = swSource.match(/const VERSION = '(v\d+)';/);
    assert.ok(version, "sw.js içinde `const VERSION = 'vN';` beklendi");
});
