// localStorage erişimi için tek kapı.
//
// Neden gerekli: yazmalar oyunun sıcak yolunda (checkAndClearLines -> addXp ->
// saveProgression) ve doğrudan çağrıldıklarında yakalanmamış exception fırlatabiliyorlardı.
// Kota dolduğunda (QuotaExceededError), iOS Safari'nin bazı özel gezinti sürümlerinde ve
// kullanıcı site verisini tamamen engellediğinde `localStorage` özelliğine ERİŞMEK bile
// SecurityError atar. Böyle bir durumda tur akışı ortasında patlıyordu.
//
// Davranış: depolama kullanılamıyorsa oyun çökmez, oturum boyunca bellekte tutulan bir
// yedeğe düşer. Skor/seviye o oturumda çalışır, yalnızca kalıcı olmaz.

const memory = new Map();

// Probe tamamen try içinde: yalnızca setItem değil, `localStorage` özelliğine ERİŞMEK de
// atabiliyor. Ayrıca `window` yokluğu Node'da (unit testler config.js'i import ediyor)
// sessizce bellek moduna düşürür.
let usable = false;
try {
    const probe = '__bomblok_probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    usable = true;
} catch {
    usable = false;
}

const ls = () => globalThis.localStorage;

export const KEYS = {
    best: 'bomblok_best',
    bestLegacy: 'block_blast_best',
    level: 'bomblok_level',
    xp: 'bomblok_xp',
    jokers: 'bomblok_jokers',
    nickname: 'bomblok_nickname',
    muted: 'block_blast_muted',
    music: 'bomblok_music',
    haptics: 'bomblok_haptics',
    reduceMotion: 'bomblok_reduce_motion',
    theme: 'block_blast_theme',
    pwaDismissed: 'bomblok_pwa_dismissed',
    resetVersion: 'bomblok_progress_reset_version',
    achievements: 'bomblok_unlocked_achievements',
    lifetimeStats: 'bomblok_lifetime_stats'
};

export const Storage = {
    isPersistent() {
        return usable;
    },

    get(key, fallback = null) {
        try {
            const v = usable ? ls().getItem(key) : memory.get(key);
            return v === null || v === undefined ? fallback : v;
        } catch {
            return memory.has(key) ? memory.get(key) : fallback;
        }
    },

    set(key, value) {
        const v = String(value);
        memory.set(key, v);   // bellek yedeği her zaman güncel kalsın
        if (!usable) return;
        try {
            ls().setItem(key, v);
        } catch {
            // Kota dolduysa veya izin çekildiyse bir daha denemenin anlamı yok:
            // kalan yazmalar bellek yedeğine gider.
            usable = false;
        }
    },

    remove(key) {
        memory.delete(key);
        if (!usable) return;
        try {
            ls().removeItem(key);
        } catch {
            usable = false;
        }
    },

    getInt(key, fallback = 0) {
        const n = parseInt(this.get(key, ''), 10);
        return Number.isFinite(n) ? n : fallback;
    },

    getJSON(key, fallback) {
        const raw = this.get(key, null);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            // Bozuk/elle kurcalanmış veri oyunu açılışta kilitlemesin.
            return fallback;
        }
    },

    setJSON(key, value) {
        try {
            this.set(key, JSON.stringify(value));
        } catch {
            // Döngüsel referans gibi serileştirme hataları sessizce yutulur.
        }
    }
};
