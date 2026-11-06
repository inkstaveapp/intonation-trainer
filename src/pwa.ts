/** Registers the service worker in production builds served over http(s); a no-op elsewhere (dev, Capacitor). */
export function registerServiceWorker(): void {
  if (
    !import.meta.env.PROD ||
    !('serviceWorker' in navigator) ||
    !location.protocol.startsWith('http')
  )
    return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
