import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Barbearia Brusquense',
  description: 'Política de Privacidade da Barbearia Brusquense.',
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-dvh px-4 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-green-light)' }}
        >
          ← Voltar
        </Link>
      </div>

      <h1
        className="text-5xl mb-2 tracking-wide"
        style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
      >
        Política de Privacidade
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-gray)' }}>
        Última atualização: abril de 2025
      </p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: 'var(--color-gray)' }}>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            1. Quem somos
          </h2>
          <p>
            A <strong style={{ color: 'var(--color-white)' }}>Barbearia Brusquense</strong> opera o
            sistema de agendamento online disponível em{' '}
            <span style={{ color: 'var(--color-green-light)' }}>barbeariabrusquense.com.br</span>.
            Este documento explica quais dados coletamos, como os usamos e como os protegemos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            2. Dados que coletamos
          </h2>
          <p className="mb-3">Ao criar uma conta ou fazer login, podemos coletar:</p>
          <ul className="list-disc list-inside flex flex-col gap-1 pl-2">
            <li>Nome completo</li>
            <li>Endereço de e-mail</li>
            <li>Foto de perfil (quando fornecida pela conta Google)</li>
            <li>Histórico de agendamentos realizados na plataforma</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            3. Como usamos seus dados
          </h2>
          <p className="mb-3">Utilizamos suas informações exclusivamente para:</p>
          <ul className="list-disc list-inside flex flex-col gap-1 pl-2">
            <li>Identificar sua conta e autenticar seu acesso</li>
            <li>Registrar e gerenciar seus agendamentos</li>
            <li>Entrar em contato em caso de alteração ou cancelamento de horário</li>
          </ul>
          <p className="mt-3">
            Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins
            comerciais.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            4. Login com Google
          </h2>
          <p>
            Quando você opta por entrar com sua conta Google, recebemos apenas as informações que
            você autoriza: nome, e-mail e foto de perfil. Não temos acesso à sua senha do Google nem
            a outros dados da sua conta.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            5. Armazenamento e segurança
          </h2>
          <p>
            Seus dados são armazenados de forma segura pelo{' '}
            <strong style={{ color: 'var(--color-white)' }}>Supabase</strong>, plataforma com
            criptografia em trânsito (TLS) e em repouso. O acesso é restrito apenas ao sistema e aos
            responsáveis pela barbearia.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            6. Seus direitos
          </h2>
          <p className="mb-3">Você pode a qualquer momento:</p>
          <ul className="list-disc list-inside flex flex-col gap-1 pl-2">
            <li>Solicitar acesso aos seus dados</li>
            <li>Pedir a exclusão da sua conta e dados associados</li>
            <li>Revogar o acesso do app à sua conta Google</li>
          </ul>
          <p className="mt-3">
            Para exercer esses direitos, entre em contato pelo Instagram{' '}
            <a
              href="https://instagram.com/barbeariabrusquense"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-green-light)' }}
            >
              @barbeariabrusquense
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-white)' }}>
            7. Alterações nesta política
          </h2>
          <p>
            Podemos atualizar esta política ocasionalmente. A data no topo desta página indica a
            versão mais recente. Recomendamos revisitá-la periodicamente.
          </p>
        </section>

      </div>
    </main>
  )
}
