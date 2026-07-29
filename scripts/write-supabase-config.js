// supabase-config.js dosyasını ortam değişkenlerinden üretir (CI'da deploy adımı çalıştırır).
//
// Değerler JSON.stringify ile yazılıyor: secret içinde tırnak, ters bölü veya satır sonu
// olsa bile üretilen JavaScript geçerli kalır. Workflow YAML'ının içine `${{ secrets.X }}`
// olarak gömmek bu garantiyi vermiyordu.
//
// Secret tanımlı değilse boş değer yazılır; oyun yine yayınlanır, sadece leaderboard kapalı olur.

import { writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

const header = url && key
    ? '// Bu dosya GitHub Actions tarafından üretildi. Repoya eklenmez.'
    : '// Supabase secret degerleri ayarli degil. Leaderboard devre disi.';

writeFileSync(
    'supabase-config.js',
    `${header}\n` +
    `window.SUPABASE_URL = ${JSON.stringify(url)};\n` +
    `window.SUPABASE_ANON_KEY = ${JSON.stringify(key)};\n`
);

console.log(
    url && key
        ? 'supabase-config.js üretildi (leaderboard etkin).'
        : 'supabase-config.js üretildi (secret yok, leaderboard devre dışı).'
);
