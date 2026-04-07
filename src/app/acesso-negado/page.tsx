import Link from 'next/link'

export default function AcessoNegadoPage() {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: '#3a1a1a' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1
          className="text-4xl mb-3 tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Acesso negado
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-gray)' }}>
          Sua conta não tem permissão para acessar o painel administrativo.
        </p>
        <Link
          href="/agendar"
          className="inline-block rounded-xl px-6 py-3 text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
        >
          Voltar para agendamento
        </Link>
      </div>
    </main>
  )
}
