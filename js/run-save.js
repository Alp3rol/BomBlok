// Devam eden turun kaydı.
//
// Sekme kapandığında / telefon geldiğinde 500 puanlık tur kayboluyordu. Artık her hamleden
// sonra tahta durumu yazılıyor ve açılışta geri yükleniyor.
//
// Kapsam dışı bıraktıklarım ve nedenleri:
//   - Fever Mode: 10 saniyelik GERÇEK zamanlı sayaç. Yeniden yüklemede kalan süre anlamsız
//     olurdu (kullanıcı yarın da açabilir), bu yüzden kapalı olarak geri dönülür.
//   - previousState (Geri Al anlık görüntüsü): tek bir hamlenin geri alınması için tutulur,
//     tur boyu saklamak kaydı gereksiz büyütür. Geri Al yeniden yükleme sonrası devre dışı
//     başlar; undoUsedThisGame KAYDEDİLİR ki sayfayı yenileyerek hak tazelenemesin.
//
// Şema sürümü: alan yapısı değişirse eski kayıtlar okunmadan atılır.

import { Storage } from './storage.js';
import { state } from './state.js';
import { SCHEMA, isValidSave } from './run-save-schema.js';

const KEY = 'bomblok_run';

export function saveRun() {
    // Biten turu saklamanın anlamı yok; oyuncu yeni oyuna başlayacak.
    if (state.isGameOver) return;

    Storage.setJSON(KEY, {
        schema: SCHEMA,
        grid: state.grid,
        dockedBlocks: state.dockedBlocks,
        timeBombs: state.timeBombs,
        score: state.score,
        comboCount: state.comboCount,
        rotationRights: state.rotationRights,
        undoUsedThisGame: state.undoUsedThisGame,
        rerollUsedThisGame: state.rerollUsedThisGame,
        currentMission: state.currentMission,
        missionMoves: state.missionMoves,
        movesSinceClear: state.movesSinceClear,
        consecutiveClears: state.consecutiveClears,
        usedRotationsInMission: state.usedRotationsInMission
    });
}

export function clearRun() {
    Storage.remove(KEY);
}

/**
 * Kaydı state'e uygular. Çağıran taraf DOM'u (initGrid/redrawDock) kendisi tazeler.
 * @returns {boolean} geri yükleme yapıldıysa true
 */
export function restoreRun() {
    const save = Storage.getJSON(KEY, null);
    if (!isValidSave(save)) {
        // Bozuk, elle kurcalanmış veya eski şemalı kayıt sessizce atılır — açılış kilitlenmesin.
        clearRun();
        return false;
    }

    state.grid = save.grid;
    state.dockedBlocks = save.dockedBlocks;
    state.timeBombs = save.timeBombs;
    state.score = save.score;
    state.comboCount = save.comboCount || 0;
    state.rotationRights = save.rotationRights || 0;
    state.undoUsedThisGame = !!save.undoUsedThisGame;
    state.rerollUsedThisGame = !!save.rerollUsedThisGame;
    state.missionMoves = save.missionMoves || 0;
    state.movesSinceClear = save.movesSinceClear || 0;
    state.consecutiveClears = save.consecutiveClears || 0;
    state.usedRotationsInMission = save.usedRotationsInMission || 0;

    // Geri Al yeniden yükleme sonrası devre dışı: anlık görüntü kaydedilmiyor.
    state.previousState = null;
    state.isGameOver = false;

    // 'hiztesti' gerçek zamanlı 30 saniyelik sayaca dayanıyor; yeniden yüklemede kalan süre
    // anlamsız olur ve sayacı da kaydetmiyoruz. Böyle bir görevi geri yüklemek yerine
    // çağıranın yeni görev başlatmasına bırakıyoruz.
    const mission = save.currentMission;
    if (mission && typeof mission.type === 'string' && mission.type !== 'hiztesti' && !mission.completed) {
        state.currentMission = mission;
    }

    return true;
}

export function hasSavedRun() {
    return isValidSave(Storage.getJSON(KEY, null));
}
