// Flat config (ESLint 9+). Build step'i olmayan bir proje olduğu için kural seti bilinçli
// olarak dar tutuldu: amaç stil dayatmak değil, sessizce üretime sızabilecek hataları
// yakalamak (kullanılmayan import, tanımsız değişken, ölü atama).

const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    localStorage: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    requestIdleCallback: 'readonly',
    structuredClone: 'readonly',
    fetch: 'readonly',
    Request: 'readonly',
    Response: 'readonly',
    URL: 'readonly',
    caches: 'readonly',
    self: 'readonly',
    AudioContext: 'readonly',
    webkitAudioContext: 'readonly',
    PointerEvent: 'readonly',
    MouseEvent: 'readonly',
    getComputedStyle: 'readonly',
    MutationObserver: 'readonly',
    HTMLElement: 'readonly',
    KeyboardEvent: 'readonly'
};

export default [
    {
        // Bağımlılıklar, asset'ler ve üretilen/yerel config dosyası denetlenmez.
        ignores: ['node_modules/**', 'assets/**', 'supabase-config.js', 'supabase-config.example.js']
    },
    {
        // Build/CI yardımcı script'leri Node ortamında çalışıyor.
        files: ['scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: { process: 'readonly', console: 'readonly' }
        },
        rules: {
            'no-unused-vars': 'error',
            'no-undef': 'error',
            'no-var': 'error',
            'prefer-const': 'warn'
        }
    },
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: browserGlobals
        },
        rules: {
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
            'no-undef': 'error',
            'no-implicit-globals': 'error',
            'no-var': 'error',
            'prefer-const': 'warn',
            'eqeqeq': ['warn', 'smart'],
            'no-console': ['warn', { allow: ['warn', 'error'] }]
        }
    },
    {
        // Service worker: ayrı global ortam, modül değil.
        files: ['sw.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'script',
            globals: { ...browserGlobals, location: 'readonly' }
        },
        rules: {
            'no-unused-vars': 'error',
            'no-undef': 'error'
        }
    },
    {
        // Testler Node ortamında çalışıyor.
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: { process: 'readonly', console: 'readonly' }
        },
        rules: {
            'no-unused-vars': 'error',
            'no-undef': 'error'
        }
    }
];
