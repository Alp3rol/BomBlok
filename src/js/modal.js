// Modal davranışı, tek yerde.
//
// Dört modal var (ayarlar, nasıl oynanır, leaderboard, oyun bitti) ve her biri kendi
// aç/kapa/arka-plana-tıkla kodunu taşıyordu; hiçbirinde diyalog semantiği, Escape, odak
// tuzağı veya odak geri dönüşü yoktu. Ekran okuyucu kullanıcısı modalın açıldığını
// duymuyor, klavye kullanıcısı Tab ile modalın ARKASINDAKI oyun tahtasına kaçabiliyordu.
//
// Aynı ezberi dört kez yazmak yerine davranış burada toplandı.

const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

let openModal = null;   // aynı anda yalnızca bir modal açık olabilir

function focusableIn(el) {
    return [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
}

function onKeyDown(e) {
    if (!openModal) return;

    if (e.key === 'Escape' && openModal.dismissible) {
        e.preventDefault();
        openModal.close();
        return;
    }

    if (e.key !== 'Tab') return;

    // Odak tuzağı: Tab modalın dışına çıkmamalı. Aksi halde klavye kullanıcısı görünmeyen
    // arka plandaki oyun tahtasına ve butonlara sekiyordu.
    const items = focusableIn(openModal.el);
    if (items.length === 0) {
        e.preventDefault();
        return;
    }
    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

document.addEventListener('keydown', onKeyDown, true);

/**
 * Bir overlay elementini erişilebilir modala dönüştürür.
 *
 * @param {HTMLElement} el `.modal-overlay` kökü
 * @param {object} opts
 * @param {string}  [opts.labelledBy] başlık elementinin id'si
 * @param {string}  [opts.label] başlık elementi yoksa doğrudan etiket
 * @param {boolean} [opts.dismissible=true] Escape ve arka plan tıklamasıyla kapanır mı
 * @param {() => HTMLElement|null} [opts.initialFocus] açılışta odaklanacak eleman
 * @param {() => void} [opts.onOpen]
 * @param {() => void} [opts.onClose]
 */
export function createModal(el, opts = {}) {
    if (!el) return null;

    const dismissible = opts.dismissible !== false;

    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (opts.labelledBy) el.setAttribute('aria-labelledby', opts.labelledBy);
    else if (opts.label) el.setAttribute('aria-label', opts.label);

    const api = {
        el,
        dismissible,
        trigger: null,

        isOpen() {
            return !el.classList.contains('hidden');
        },

        open(trigger) {
            // Başka bir modal açıksa önce onu kapat: iki aria-modal aynı anda açık olamaz.
            if (openModal && openModal !== api) openModal.close();

            api.trigger = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
            el.classList.remove('hidden');
            openModal = api;

            if (opts.onOpen) opts.onOpen();

            const target = (opts.initialFocus && opts.initialFocus()) || focusableIn(el)[0];
            if (target) target.focus();
        },

        close() {
            if (!api.isOpen()) return;
            el.classList.add('hidden');
            if (openModal === api) openModal = null;

            if (opts.onClose) opts.onClose();

            // Odağı açan öğeye geri ver; yoksa klavye kullanıcısı sayfanın başına savrulur.
            if (api.trigger && document.contains(api.trigger)) api.trigger.focus();
            api.trigger = null;
        },

        toggle(trigger) {
            if (api.isOpen()) api.close();
            else api.open(trigger);
        }
    };

    if (dismissible) {
        el.addEventListener('click', (e) => {
            if (e.target === el) api.close();
        });
    }

    return api;
}
