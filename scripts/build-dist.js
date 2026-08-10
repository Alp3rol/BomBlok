import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const output = 'dist';
const publicFiles = ['index.html', 'manifest.json', 'sw.js', '.nojekyll'];
const assets = [
    'apple-touch-icon.png',
    'favicon-32.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'og-cover.jpg'
];

rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'assets'), { recursive: true });

for (const file of publicFiles) cpSync(join('public', file), join(output, file));
cpSync(join('src', 'css', 'style.css'), join(output, 'style.css'));
cpSync(join('src', 'css', 'themes.css'), join(output, 'themes.css'));
cpSync(join('src', 'js'), join(output, 'js'), { recursive: true });
for (const asset of assets) cpSync(join('src', 'assets', asset), join(output, 'assets', asset));

if (existsSync('supabase-config.js')) {
    cpSync('supabase-config.js', join(output, 'supabase-config.js'));
} else {
    writeFileSync(
        join(output, 'supabase-config.js'),
        '// Supabase ayarı yok; leaderboard devre dışı.\n' +
        'window.SUPABASE_URL = "";\nwindow.SUPABASE_ANON_KEY = "";\n'
    );
}

const forbidden = ['.git', 'node_modules', 'tests', 'scripts', 'supabase', 'package.json', 'package-lock.json'];
for (const name of forbidden) {
    if (existsSync(join(output, name))) throw new Error(`Dağıtım paketinde geliştirme dosyası var: ${name}`);
}

const rootFiles = readdirSync(output).sort();
console.log(`Minimal dağıtım paketi hazır: ${output}/ (${rootFiles.join(', ')})`);
