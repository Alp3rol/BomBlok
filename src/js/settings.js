// Ayarlar modalı.
//
// Üç şey kullanıcı erişimine açılıyor:
//   - Ses efektleri (zaten header'daki 🔊 butonuyla da kapatılabiliyor, burada da duruyor)
//   - Arka plan müziği: eskiden ses efektlerinden ayrı kapatılamıyordu; ilk dokunuşta
//     habersiz başlayan müzik için tek çare tüm sesi kapatmaktı.
//   - Titreşim: Haptics.enabled kodda sabit `true` idi, kullanıcının kapatma yolu yoktu.
//   - Hareketi azalt: yalnızca işletim sistemi tercihine bağlıydı; artık oyun içinden de açılabilir.

import { Storage, KEYS } from './storage.js';
import { createModal } from './modal.js';
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

        // Diyalog semantiği, Escape, arka plan tıklaması, odak tuzağı ve odak geri dönüşü
        // ortak yardımcıdan geliyor; burada yalnızca içerik senkronizasyonu kalıyor.
        this.dialog = createModal(this.modal, {
            labelledBy: 'settings-title',
            onOpen: () => this.syncUI()
        });

        this.trigger = openBtn;
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dialog.open(openBtn);
        });
        if (closeBtn) closeBtn.addEventListener('click', () => this.dialog.close());
        if (doneBtn) doneBtn.addEventListener('click', () => this.dialog.close());

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
        if (this.dialog) this.dialog.open(this.trigger);
    },

    close() {
        if (this.dialog) this.dialog.close();
    }
};
