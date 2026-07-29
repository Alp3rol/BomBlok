// Klavye ile oynanabilirlik.
//
// Oyun tamamen işaretçi (pointer) olayları üzerine kuruluydu: tahta hücreleri <div>, dock
// yuvaları <div>, hiçbiri odaklanabilir değildi. Yani klavyeyle veya yardımcı teknolojiyle
// oyun oynanamıyordu — WCAG 2.1.1 (Seviye A) ihlali.
//
// Model: tahta tek bir sekme durağı. Odaklandığında ok tuşlarıyla gezinen bir imleç var,
// Enter/Space seçili bloğu imlecin bulunduğu yere koyuyor. 64 hücreyi ayrı sekme durağı
// yapmak (roving tabindex) klavye kullanıcısını tahtada hapsederdi.
//
// role="application": ekran okuyucuların ok tuşlarını kendi gezinme moduna kaçırmadan
// sayfaya iletmesi için. Oyun tahtası bunun meşru bir kullanım alanı; geri bildirim
// aria-live bölgesiyle sesli olarak veriliyor.

import { state } from './state.js';
import { getCellElement } from './grid.js';
import { AudioFX } from './audio.js';

const GRID = 8;
const CURSOR_CLASS = 'kb-cursor';

let cb = {};
const cursor = { r: 3, c: 3 };
let boardEl = null;
let liveEl = null;

function announce(text) {
    if (liveEl) liveEl.textContent = text;
}

function shapeLabel(shape) {
    if (!shape) return 'boş';
    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;
    const cells = shape.matrix.flat().filter((v) => v === 1).length;
    return `${rows}'e ${cols} blok, ${cells} hücre${shape.bombCell ? ', bombalı' : ''}`;
}

function drawCursor() {
    boardEl.querySelectorAll(`.${CURSOR_CLASS}`).forEach((el) => el.classList.remove(CURSOR_CLASS));
    const cell = getCellElement(cursor.r, cursor.c);
    if (cell) cell.classList.add(CURSOR_CLASS);
}

function clearCursor() {
    if (!boardEl) return;
    boardEl.querySelectorAll(`.${CURSOR_CLASS}`).forEach((el) => el.classList.remove(CURSOR_CLASS));
}

function refreshPreview() {
    if (state.selectedBlockIndex === null) return;
    cb.showPreview(cursor.r, cursor.c);
    drawCursor();
}

function moveCursor(dr, dc) {
    cursor.r = Math.min(GRID - 1, Math.max(0, cursor.r + dr));
    cursor.c = Math.min(GRID - 1, Math.max(0, cursor.c + dc));
    refreshPreview();
    drawCursor();
}

function placeAtCursor() {
    if (state.selectedBlockIndex === null) {
        announce('Önce alttaki şekillerden birini seç.');
        return;
    }
    const beforeScore = state.score;
    const beforeFilled = state.grid.flat().filter((v) => v !== 0).length;

    cb.tryPlace(cursor.r, cursor.c);

    // tryPlace sığmayan konumda sessizce çıkıyor; farkı ölçerek sonucu duyuruyoruz.
    const placed = state.grid.flat().filter((v) => v !== 0).length !== beforeFilled;
    if (placed) {
        announce(`Yerleştirildi. Skor ${state.score}.`);
        drawCursor();
    } else {
        announce('Buraya sığmıyor.');
    }
    if (state.score === beforeScore && !placed) {
        try { AudioFX.playBuzzer(); } catch { /* ses kapalı olabilir */ }
    }
}

function selectSlot(index) {
    const shape = state.dockedBlocks[index];
    if (!shape) {
        announce('Bu yuva boş.');
        return;
    }
    cb.selectBlock(index);
    announce(`${shapeLabel(shape)} seçildi. Ok tuşlarıyla taşı, Enter ile yerleştir, R ile döndür.`);
    boardEl.focus();
    refreshPreview();
}

function onBoardKeyDown(e) {
    if (state.isGameOver) return;

    switch (e.key) {
        case 'ArrowUp': e.preventDefault(); moveCursor(-1, 0); break;
        case 'ArrowDown': e.preventDefault(); moveCursor(1, 0); break;
        case 'ArrowLeft': e.preventDefault(); moveCursor(0, -1); break;
        case 'ArrowRight': e.preventDefault(); moveCursor(0, 1); break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            placeAtCursor();
            break;
        case 'Escape':
            if (state.selectedBlockIndex !== null) {
                e.preventDefault();
                cb.deselectBlock();
                clearCursor();
                announce('Seçim iptal edildi.');
                focusSlot(0);
            }
            break;
        case 'r':
        case 'R':
            if (state.selectedBlockIndex !== null) {
                e.preventDefault();
                const idx = state.selectedBlockIndex;
                if (cb.rotateDockBlock(idx)) {
                    // Döndürme dock'u yeniden çizdiği için seçim görselini geri koy.
                    cb.selectBlock(idx);
                    refreshPreview();
                    announce(`Döndürüldü. Kalan döndürme hakkı: ${state.rotationRights}.`);
                } else {
                    announce('Döndürme hakkın yok. Joker harcayarak hak alabilirsin.');
                }
            }
            break;
        default:
            break;
    }
}

function focusSlot(index) {
    const slots = document.querySelectorAll('.dock-slot');
    const slot = slots[index];
    if (slot) slot.focus();
}

function onSlotKeyDown(e, index) {
    if (state.isGameOver) return;
    const slots = document.querySelectorAll('.dock-slot');

    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSlot(index);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusSlot((index + 1) % slots.length);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusSlot((index - 1 + slots.length) % slots.length);
    }
}

/** Dock yuvalarının erişilebilir adını içindeki şekle göre günceller. */
export function syncDockAccessibility() {
    document.querySelectorAll('.dock-slot').forEach((slot, index) => {
        const shape = state.dockedBlocks[index];
        slot.setAttribute('aria-label', shape
            ? `${index + 1}. şekil: ${shapeLabel(shape)}. Seçmek için Enter.`
            : `${index + 1}. yuva boş`);
        slot.setAttribute('aria-disabled', shape ? 'false' : 'true');
    });
}

export const Keyboard = {
    init(callbacks) {
        cb = callbacks;
        boardEl = document.getElementById('grid-board');
        liveEl = document.getElementById('a11y-live');
        if (!boardEl) return;

        boardEl.setAttribute('tabindex', '0');
        boardEl.setAttribute('role', 'application');
        boardEl.setAttribute('aria-label',
            'Oyun tahtası, 8 çarpı 8. Ok tuşlarıyla imleci taşı, Enter ile yerleştir, R ile döndür, Escape ile seçimi bırak.');
        boardEl.addEventListener('keydown', onBoardKeyDown);
        boardEl.addEventListener('focus', () => { if (state.selectedBlockIndex !== null) refreshPreview(); });
        boardEl.addEventListener('blur', clearCursor);

        document.querySelectorAll('.dock-slot').forEach((slot, index) => {
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('role', 'button');
            slot.addEventListener('keydown', (e) => onSlotKeyDown(e, index));
        });

        // Dock beş ayrı yoldan değişiyor (ilk üretim, yeniden çizim, döndürme, yerleştirme,
        // reroll). Her birine çağrı serpiştirmek yerine DOM'u gözlüyoruz: hangi yol olursa
        // olsun erişilebilir adlar güncel kalıyor ve unutulabilecek bir çağrı noktası yok.
        const dock = document.getElementById('block-dock');
        if (dock && typeof MutationObserver !== 'undefined') {
            new MutationObserver(() => syncDockAccessibility())
                .observe(dock, { childList: true, subtree: true });
        }

        syncDockAccessibility();
    },

    syncDockAccessibility
};
