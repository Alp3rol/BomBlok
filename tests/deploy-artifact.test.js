import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');
const buildScript = readFileSync(join(root, 'scripts', 'build-dist.js'), 'utf8');

test('Pages yalnızca minimal dist klasörünü yayınlıyor', () => {
    assert.match(workflow, /uses:\s*actions\/upload-pages-artifact@/);
    assert.match(workflow, /path:\s*['"]dist['"]/);
    assert.doesNotMatch(workflow, /path:\s*['"]\.['"]/);
});

test('dağıtım oluşturucu geliştirme klasörlerini pakete almıyor', () => {
    for (const name of ['tests', 'scripts', 'supabase', 'node_modules', '.git']) {
        assert.match(buildScript, new RegExp(`['"]${name.replace('.', '\\.')}['"]`));
    }
});

test('CI ücretsiz dependency audit çalıştırıyor', () => {
    assert.match(workflow, /npm audit --audit-level=high/);
});

test('CI coverage eşiği ve secret kontrolü çalıştırıyor', () => {
    assert.match(workflow, /npm run test:coverage/);
    assert.match(workflow, /npm run security:secrets/);
});
