// Kaydedilmiş tur verisinin şema doğrulaması.
//
// state.js modül yüklenirken DOM'a dokunduğu için run-save.js Node'da import edilemiyor.
// Doğrulama, kaydın en riskli parçası — kabul edilen bozuk bir kayıt açılışı kilitler —
// bu yüzden saf tutulup ayrı dosyaya alındı ve doğrudan unit test ediliyor.

export const SCHEMA = 1;
const GRID = 8;

/** Tahta gerçekten 8x8 mi ve hücreler tanınan tiplerde mi? */
export function isValidGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== GRID) return false;
    return grid.every((row) =>
        Array.isArray(row) &&
        row.length === GRID &&
        row.every((cell) => cell === 0 || typeof cell === 'string')
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

    return typeof shape.color === 'string';
}

export function isValidSave(save) {
    if (!save || save.schema !== SCHEMA) return false;
    if (!isValidGrid(save.grid)) return false;
    if (!Array.isArray(save.dockedBlocks) || save.dockedBlocks.length !== 3) return false;
    if (!save.dockedBlocks.every(isValidShape)) return false;
    if (!Number.isFinite(save.score) || save.score < 0) return false;
    if (!Array.isArray(save.timeBombs)) return false;
    // Dock tamamen boşsa geri yüklenecek bir tur yok.
    if (save.dockedBlocks.every((b) => b === null)) return false;
    return true;
}
