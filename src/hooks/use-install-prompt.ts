'use client'

import { useState, useEffect } from 'react'
import { getDeferredPrompt, clearDeferredPrompt } from '@/lib/pwa'

export function useInstallPrompt() {
  const [hasPrompt, setHasPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOSSafari, setIsIOSSafari] = useState(false)

  useEffect(() => {
    // Already running as installed PWA (standalone)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsInstalled(standalone)

    // iOS Safari detection (not Chrome/Firefox on iOS)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const iosSafari = ios && !/crios|fxios|opios/i.test(navigator.userAgent)
    setIsIOSSafari(iosSafari)

    // Check if PWACapture already stored a prompt
    setHasPrompt(!!getDeferredPrompt())

    // React to events dispatched by PWACapture
    const onPrompt = () => setHasPrompt(true)
    const onInstalled = () => { setIsInstalled(true); setHasPrompt(false) }
    window.addEventListener('pwa:prompt', onPrompt)
    window.addEventListener('pwa:installed', onInstalled)
    return () => {
      window.removeEventListener('pwa:prompt', onPrompt)
      window.removeEventListener('pwa:installed', onInstalled)
    }
  }, [])

  async function install(): Promise<boolean> {
    const prompt = getDeferredPrompt()
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      clearDeferredPrompt()
      setIsInstalled(true)
      setHasPrompt(false)
    }
    return outcome === 'accepted'
  }

  const canInstall = !isInstalled && hasPrompt
  const showIOS = !isInstalled && isIOSSafari

  return { canInstall, showIOS, isInstalled, install }
}
