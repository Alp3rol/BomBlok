// Boyut sabitleri. Bağımlılığı yok, bu yüzden saf mantık modülleri (rules.js,
// run-save-schema.js) ve Node altındaki unit testler de sorunsuz import edebiliyor.

/**
 * Tahtanın kenar uzunluğu. Daha önce 8 sayısı otuzdan fazla yerde elle yazılıydı:
 * döngü sınırları, sınır kontrolleri, dizi oluşturma, kaydedilmiş tur doğrulaması ve
 * partikül hücre boyutu. Tek bir yerden okunmadığı sürece tahta boyutu değiştirilemezdi
 * ve tek bir gözden kaçan sayı sessiz bir hataya dönüşürdü.
 */
export const GRID = 8;

/** Tahtadaki son satır/sütun indeksi. */
export const LAST = GRID - 1;

/** Verilen satır/sütun tahtanın içinde mi? */
export function inBounds(r, c) {
    return r >= 0 && r < GRID && c >= 0 && c < GRID;
}
