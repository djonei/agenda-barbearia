'use client'

import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useState } from 'react'

export default function InstallBanner() {
  const { canInstall, showIOS, install, dismiss } = useInstallPrompt()
  const [installing, setInstalling] = useState(false)
  const [done, setDone] = useState(false)

  // Nothing to show
  if (done || (!canInstall && !showIOS)) return null

  async function handleInstall() {
    setInstalling(true)
    const accepted = await install()
    setInstalling(false)
    if (accepted) setDone(true)
  }

  return (
    <div
      className="mb-6 rounded-xl p-4"
      style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(99,102,241,0.4)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(129,140,248)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
              Instale o aplicativo
            </p>
            <p className="text-xs" style={{ color: 'var(--color-gray)' }}>
              Acesse seus agendamentos com mais facilidade
            </p>
          </div>
        </div>
        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="p-1 flex-shrink-0"
          style={{ color: 'var(--color-gray)' }}
          aria-label="Fechar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Chrome/Edge Android — native prompt */}
      {canInstall && (
        <button
          onClick={handleInstall}
          disabled={installing}
          className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: 'rgb(99,102,241)', color: '#fff' }}
        >
          {installing ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Instalando...
            </span>
          ) : (
            'Instalar agora'
          )}
        </button>
      )}

      {/* iOS Safari — manual instructions */}
      {showIOS && (
        <div
          className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
          style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--color-gray)' }}
        >
          Toque em{' '}
          <span style={{ color: 'var(--color-white)' }}>
            <svg
              width="12" height="12"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ display: 'inline', verticalAlign: 'middle', marginBottom: 2 }}
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {' '}Compartilhar
          </span>
          {' '}e depois em{' '}
          <span style={{ color: 'var(--color-white)', fontWeight: 600 }}>
            &ldquo;Adicionar à Tela de Início&rdquo;
          </span>
          .
        </div>
      )}
    </div>
  )
}
