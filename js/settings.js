// Ayarlar modalı.
//
// Üç şey kullanıcı erişimine açılıyor:
//   - Ses efektleri (zaten header'daki 🔊 butonuyla da kapatılabiliyor, burada da duruyor)
//   - Arka plan müziği: eskiden ses efektlerinden ayrı kapatılamıyordu; ilk dokunuşta
//     habersiz başlayan müzik için tek çare tüm sesi kapatmaktı.
//   - Titreşim: Haptics.enabled kodda sabit `true` idi, kullanıcının kapatma yolu yoktu.
//   - Hareketi azalt: yalnızca işletim sistemi tercihine bağlıydı; artık oyun içinden de açılabilir.

import { Storage, KEYS } from './storage.js';
import { AudioFX } from './audio.js';
import { Haptics } from './haptics.js';

const REDUCE_MOTION_CLASS = 'reduce-motion';

function applyReduceMotion(on) {
    document.body.classList.toggle(REDUCE_MOTION_CLASS, !!on);
}

export const Settings = {
    modal: null,
    trigger: null,

    init() {
        this.modal = document.getElementById('settings-modal');
        const openBtn = document.getElementById('settings-btn');
        const closeBtn = document.getElementById('settings-close-btn');
        const doneBtn = document.getElementById('settings-done-btn');
        if (!this.modal || !openBtn) return;

        // Kayıtlı hareket tercihini açılışta uygula (ses/titreşim kendi modüllerinde okunuyor).
        applyReduceMotion(Storage.get(KEYS.reduceMotion) === 'true');

        // Tetikleyen butonu doğrudan tutuyoruz: kapanışta odağı geri verirken
        // document.activeElement'e güvenmek kırılgan (programatik açılışta body olabiliyor).
        this.trigger = openBtn;
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.open();
        });
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (doneBtn) doneBtn.addEventListener('click', () => this.close());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Escape ile kapat — diğer modallarda olmayan bir davranış, burada standarda uyuyoruz.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });

        this.bindToggle('setting-sfx',
            () => !AudioFX.muted,
            (on) => {
                // toggleMute mevcut header butonuyla aynı yolu kullanır (ikon senkron kalsın).
                if (AudioFX.muted === on) AudioFX.toggleMute();
                AudioFX.init();
            });

        this.bindToggle('setting-music',
            () => AudioFX.musicEnabled,
            (on) => {
                AudioFX.init();
                AudioFX.setMusicEnabled(on);
            });

        this.bindToggle('setting-haptics',
            () => Haptics.enabled,
            (on) => {
                Haptics.setEnabled(on);
                if (on) Haptics.vibrateGrab();   // açıkken kısa bir örnek titreşim
            });

        this.bindToggle('setting-reduce-motion',
            () => document.body.classList.contains(REDUCE_MOTION_CLASS),
            (on) => {
                applyReduceMotion(on);
                Storage.set(KEYS.reduceMotion, on);
            });
    },

    /**
     * Bir onay kutusunu okuma/yazma çiftine bağlar.
     * @param {string} id input elementinin id'si
     * @param {() => boolean} read mevcut değeri döndürür
     * @param {(on: boolean) => void} write yeni değeri uygular
     */
    bindToggle(id, read, write) {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = read();
        el.addEventListener('change', () => {
            write(el.checked);
            el.checked = read();   // yazma reddedilirse UI gerçeği yansıtsın
        });
        this._toggles = this._toggles || [];
        this._toggles.push({ el, read });
    },

    syncUI() {
        (this._toggles || []).forEach(({ el, read }) => { el.checked = read(); });
        const hapticsRow = document.getElementById('setting-haptics-row');
        if (hapticsRow) {
            // Cihaz titreşimi desteklemiyorsa satırı kapalı göster, yanıltıcı olmasın.
            const supported = Haptics.isSupported();
            hapticsRow.classList.toggle('setting-unavailable', !supported);
            const input = document.getElementById('setting-haptics');
            if (input) input.disabled = !supported;
        }
    },

    open() {
        if (!this.modal) return;
        this.syncUI();
        this.modal.classList.remove('hidden');
        const first = this.modal.querySelector('input, button');
        if (first) first.focus();
    },

    close() {
        if (!this.modal) return;
        this.modal.classList.add('hidden');
        // Odağı açan butona geri ver — klavye kullanıcısı sayfanın başına savrulmasın.
        if (this.trigger) this.trigger.focus();
    }
};
