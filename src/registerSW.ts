/**
 * Service Worker & PWA installation helper
 */

let deferredPrompt: any = null;

export function registerServiceWorker() {
  const isDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.includes('ais-dev-')
  );

  if (isDev) {
    console.log('[PWA] Service Worker registration bypassed in development mode to avoid HMR caching conflict.');
    return;
  }
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered correctly!', reg.scope);
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    });

    // Capture beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt = e;
      // Dispatch custom event to notify React components
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    });
  }
}

export function isAppInstallable(): boolean {
  return !!deferredPrompt;
}

export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('[PWA] Installation prompt not deferred yet.');
    return false;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  
  // Reset prompt
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-installed-status-changed'));
  
  return outcome === 'accepted';
}
