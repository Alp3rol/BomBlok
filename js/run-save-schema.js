import { GRID } from './constants.js';

// Kaydedilmiş tur verisinin şema doğrulaması.
//
// state.js modül yüklenirken DOM'a dokunduğu için run-save.js Node'da import edilemiyor.
// Doğrulama, kaydın en riskli parçası — kabul edilen bozuk bir kayıt açılışı kilitler —
// bu yüzden saf tutulup ayrı dosyaya alındı ve doğrudan unit test ediliyor.

export const SCHEMA = 1;

const CELL_VALUES = new Set([
    'orange', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan',
    'orange-bomb', 'blue-bomb', 'green-bomb', 'yellow-bomb',
    'purple-bomb', 'pink-bomb', 'cyan-bomb',
    'ice', 'stone', 'timebomb'
]);

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isOptionalNonNegativeInteger = (value) => value === undefined || isNonNegativeInteger(value);

/** Tahta gerçekten 8x8 mi ve hücreler tanınan tiplerde mi? */
export function isValidGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== GRID) return false;
    return grid.every((row) =>
        Array.isArray(row) &&
        row.length === GRID &&
        row.every((cell) => cell === 0 || CELL_VALUES.has(cell))
    );
}

/** Dock yuvası ya boş ya da matrisi/rengi yerinde bir şekil olmalı. */
export function isValidShape(shape) {
    if (shape === null) return true;
    if (typeof shape !== 'object' || !Array.isArray(shape.matrix) || shape.matrix.length === 0) return false;

    const width = shape.matrix[0].length;
    if (width === 0) return false;

    const rowsOk = shape.matrix.every((row) =>
        Array.isArray(row) && row.length === width && row.every((v) => v === 0 || v === 1)
    );
    if (!rowsOk) return false;

    // Tamamen boş bir matris yerleştirilemez.
    if (!shape.matrix.some((row) => row.some((v) => v === 1))) return false;

    if (!['orange', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan'].includes(shape.color)) return false;

    if (shape.bombCell !== undefined) {
        const { r, c } = shape.bombCell || {};
        if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
        if (r < 0 || r >= shape.matrix.length || c < 0 || c >= width) return false;
        if (shape.matrix[r][c] !== 1) return false;
    }

    return true;
}

export function isValidTimeBomb(bomb) {
    return !!bomb &&
        Number.isInteger(bomb.r) && bomb.r >= 0 && bomb.r < GRID &&
        Number.isInteger(bomb.c) && bomb.c >= 0 && bomb.c < GRID &&
        Number.isInteger(bomb.timer) && bomb.timer >= 0 && bomb.timer <= 100;
}

export function isValidSave(save) {
    if (!save || save.schema !== SCHEMA) return false;
    if (!isValidGrid(save.grid)) return false;
    if (!Array.isArray(save.dockedBlocks) || save.dockedBlocks.length !== 3) return false;
    if (!save.dockedBlocks.every(isValidShape)) return false;
    if (!isNonNegativeInteger(save.score)) return false;
    if (save.scoreSubmissionId !== undefined && (
        typeof save.scoreSubmissionId !== 'string' ||
        save.scoreSubmissionId.length < 16 ||
        save.scoreSubmissionId.length > 128
    )) return false;
    if (!Array.isArray(save.timeBombs) || !save.timeBombs.every(isValidTimeBomb)) return false;
    if (!isOptionalNonNegativeInteger(save.comboCount)) return false;
    if (!isOptionalNonNegativeInteger(save.rotationRights)) return false;
    if (!isOptionalNonNegativeInteger(save.missionMoves)) return false;
    if (!isOptionalNonNegativeInteger(save.movesSinceClear)) return false;
    if (!isOptionalNonNegativeInteger(save.consecutiveClears)) return false;
    if (!isOptionalNonNegativeInteger(save.usedRotationsInMission)) return false;
    // Dock tamamen boşsa geri yüklenecek bir tur yok.
    if (save.dockedBlocks.every((b) => b === null)) return false;
    return true;
}
