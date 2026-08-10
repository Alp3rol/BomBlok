import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = join(root, 'src', 'js');

function dependencyGraph() {
    const graph = new Map();
    for (const file of readdirSync(jsDir).filter((name) => name.endsWith('.js'))) {
        const source = readFileSync(join(jsDir, file), 'utf8');
        const dependencies = [...source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)]
            .map((match) => normalize(join(jsDir, match[1])))
            .filter((path) => path.startsWith(jsDir));
        graph.set(normalize(join(jsDir, file)), dependencies);
    }
    return graph;
}

function findCycle(graph) {
    const visiting = new Set();
    const visited = new Set();
    const path = [];

    function visit(node) {
        if (visiting.has(node)) return [...path.slice(path.indexOf(node)), node];
        if (visited.has(node)) return null;

        visiting.add(node);
        path.push(node);
        for (const dependency of graph.get(node) || []) {
            const cycle = visit(dependency);
            if (cycle) return cycle;
        }
        path.pop();
        visiting.delete(node);
        visited.add(node);
        return null;
    }

    for (const node of graph.keys()) {
        const cycle = visit(node);
        if (cycle) return cycle;
    }
    return null;
}

test('js modülleri arasında döngüsel import yok', () => {
    const cycle = findCycle(dependencyGraph());
    const readable = cycle?.map((path) => path.replace(`${jsDir}\\`, '')).join(' -> ');
    assert.equal(cycle, null, `Döngüsel import bulundu: ${readable}`);
});
