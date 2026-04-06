'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError('Erro ao entrar com Google. Tente novamente.')
      setGoogleLoading(false)
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('E-mail não confirmado. Verifique sua caixa de entrada e clique no link de ativação.')
      } else if (error.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.')
      } else {
        setError('Erro ao fazer login. Tente novamente.')
      }
      setLoading(false)
      return
    }

    window.location.href = '/agendar'
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo-barbearia.png"
          alt="Barbearia Brusquense"
          width={180}
          height={80}
          className="object-contain"
          onError={(e) => {
            // Fallback if logo not yet added
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <h1
          className="text-4xl mb-2 tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Entrar
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-gray)' }}>
          Acesse sua conta para agendar
        </p>

        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
          >
            {error}
          </div>
        )}

        {/* Google OAuth — opção principal */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-sm font-semibold transition-colors mb-6 min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-green-primary)',
            color: 'var(--color-white)',
          }}
          onMouseEnter={(e) => {
            if (!googleLoading && !loading)
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--color-green-light)'
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--color-green-primary)'
          }}
        >
          {googleLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          <span className="text-xs" style={{ color: 'var(--color-gray)' }}>ou</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Formulário e-mail/senha */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors min-h-[48px]"
              style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid var(--color-border)',
                color: 'var(--color-white)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-green-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-gray)' }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors min-h-[48px]"
              style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid var(--color-border)',
                color: 'var(--color-white)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-green-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-colors mt-2 min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#1e1e1e',
              color: 'var(--color-white)',
              border: '1px solid var(--color-border)',
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Entrando...
              </span>
            ) : (
              'Entrar com e-mail'
            )}
          </button>
        </form>

        {/* Link para cadastro */}
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-gray)' }}>
          Não tem conta?{' '}
          <Link
            href="/cadastro"
            className="font-semibold transition-colors"
            style={{ color: 'var(--color-green-light)' }}
          >
            Criar conta
          </Link>
        </p>
      </div>

      {/* Instagram */}
      <a
        href="https://instagram.com/barbeariabrusquense"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 text-xs flex items-center gap-2 transition-opacity hover:opacity-80"
        style={{ color: 'var(--color-gray)' }}
      >
        <InstagramIcon />
        @barbeariabrusquense
      </a>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}
