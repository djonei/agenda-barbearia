'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa_install_dismissed'

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isIOSSafari, setIsIOSSafari] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Already installed (running in standalone / TWA)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsInstalled(standalone)

    // Previously dismissed by the user
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // iOS Safari (not Chrome/Firefox on iOS — those use WebKit but hide the prompt too)
    const iosSafari = ios && !/crios|fxios|opios/i.test(navigator.userAgent)
    setIsIOSSafari(iosSafari)

    // Chrome / Edge Android — capture beforeinstallprompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Track successful install
    const onInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install(): Promise<boolean> {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }
    return outcome === 'accepted'
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  // canInstall  → Chrome/Edge Android with deferred prompt ready
  // showIOS     → iOS Safari, needs manual instructions
  const canInstall = !isInstalled && !dismissed && !!deferredPrompt
  const showIOS = !isInstalled && !dismissed && isIOS && isIOSSafari

  return { canInstall, showIOS, isInstalled, install, dismiss }
}
