// CSP nedeniyle service worker kaydı HTML içindeki inline script yerine ayrı modülde tutulur.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.warn('Service worker kaydı başarısız:', err);
        });
    });
}
