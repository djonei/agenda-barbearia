'use client'

// Mounted in the root layout — captures and SUPPRESSES Chrome's native
// mini-infobar on every page, storing the event for our custom install banner.

import { useEffect } from 'react'
import { storeDeferredPrompt, clearDeferredPrompt, BeforeInstallPromptEvent } from '@/lib/pwa'

export default function PWACapture() {
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault() // Suppress Chrome native prompt on ALL pages
      storeDeferredPrompt(e as BeforeInstallPromptEvent)
      window.dispatchEvent(new CustomEvent('pwa:prompt'))
    }

    const onInstalled = () => {
      clearDeferredPrompt()
      window.dispatchEvent(new CustomEvent('pwa:installed'))
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return null
}
