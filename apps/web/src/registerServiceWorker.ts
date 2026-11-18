export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] ORBIT ServiceWorker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] ServiceWorker registration failed:', err);
        });
    });
  }
}
