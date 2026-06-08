export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(error => {
      console.warn('PWA service worker registration failed:', error);
    });
  });
}
