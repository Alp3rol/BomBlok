/**
 * Her oyun turu için tekrar kullanılamayan bir skor gönderim kimliği üretir.
 * UUID desteği olmayan eski tarayıcılarda zaman + rastgele değer yedeği kullanılır.
 */
export function createSubmissionId(cryptoProvider = globalThis.crypto) {
    if (cryptoProvider && typeof cryptoProvider.randomUUID === 'function') {
        return cryptoProvider.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function isDuplicateSubmissionError(error) {
    return !!error && error.code === '23505';
}
