// Client-side singleton — stores the deferred PWA install prompt across the app.
// Populated by PWACapture (root layout) and consumed by useInstallPrompt hook.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let _prompt: BeforeInstallPromptEvent | null = null

export function storeDeferredPrompt(e: BeforeInstallPromptEvent) {
  _prompt = e
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return _prompt
}

export function clearDeferredPrompt() {
  _prompt = null
}
