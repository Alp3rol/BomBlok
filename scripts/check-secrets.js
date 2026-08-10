import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
const trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

const findings = [];
const secretPrefix = ['sb', 'secret'].join('_');
const secretPattern = new RegExp(`${secretPrefix}_[A-Za-z0-9_-]{20,}`);
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

for (const file of files) {
    if (file === 'scripts/check-secrets.js' || statSync(file).size > 2_000_000) continue;

    const content = readFileSync(file);
    if (content.includes(0)) continue; // Görsel/font gibi binary dosyalar.
    const text = content.toString('utf8');

    if (secretPattern.test(text)) findings.push(`${file}: Supabase secret key biçimi`);

    for (const token of text.match(jwtPattern) || []) {
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
            if (payload.role === 'service_role') findings.push(`${file}: service_role JWT`);
        } catch {
            // JWT benzeri fakat çözülemeyen metin secret kanıtı değildir.
        }
    }
}

if (trackedFiles.includes('supabase-config.js')) {
    findings.push('supabase-config.js: dosya git tarafından izlenmemeli');
}

if (findings.length > 0) {
    console.error(`Gizli anahtar kontrolü başarısız:\n- ${findings.join('\n- ')}`);
    process.exitCode = 1;
} else {
    console.log('Gizli anahtar kontrolü temiz.');
}
