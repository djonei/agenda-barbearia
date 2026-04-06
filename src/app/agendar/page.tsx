import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Barber, Service } from '@/lib/types'
import { formatPrice } from '@/lib/slots'

export default async function AgendarPage() {
  const supabase = await createClient()

  // Only barbers with a slug (public page)
  const { data: barbers } = await supabase
    .from('barbers')
    .select('*')
    .not('slug', 'is', null)
    .order('name')

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)

  const { data: { user } } = await supabase.auth.getUser()

  const barberList = (barbers || []) as Barber[]
  const serviceList = (services || []) as Service[]

  return (
    <main className="min-h-dvh" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 max-w-3xl mx-auto">
        <Image
          src="/logo-barbearia.png"
          alt="Barbearia Brusquense"
          width={140}
          height={60}
          className="object-contain"
          onError={undefined}
        />
        {user ? (
          <Link
            href="/meus-agendamentos"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-green-light)', border: '1px solid var(--color-border)' }}
          >
            Meus horários
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-green-light)', border: '1px solid var(--color-border)' }}
          >
            Entrar
          </Link>
        )}
      </header>

      {/* Title */}
      <section className="px-4 pt-8 pb-6 max-w-3xl mx-auto">
        <h1
          className="text-5xl mb-2 tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
        >
          Agende seu horário
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-gray)' }}>
          Escolha um barbeiro para começar
        </p>
      </section>

      {/* Barber cards */}
      <section className="px-4 pb-12 max-w-3xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-2">
          {barberList.map((barber) => {
            const barberServices = serviceList.filter(
              (s) => s.barber_id === barber.id
            )
            return (
              <Link
                key={barber.id}
                href={`/agendar/${barber.slug}`}
                className="block rounded-2xl p-6 transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden"
                    style={{
                      border: '2px solid var(--color-green-primary)',
                      backgroundColor: '#1e1e1e',
                      color: 'var(--color-green-light)',
                    }}
                  >
                    {barber.avatar_url ? (
                      <Image
                        src={barber.avatar_url}
                        alt={barber.name}
                        width={64}
                        height={64}
                        className="rounded-full object-cover w-full h-full"
                      />
                    ) : (
                      barber.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h2
                      className="text-2xl tracking-wide"
                      style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
                    >
                      {barber.name}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--color-gray)' }}>
                      {barberServices.length} serviço{barberServices.length !== 1 ? 's' : ''} disponíve{barberServices.length !== 1 ? 'is' : 'l'}
                    </p>
                  </div>
                </div>

                {/* Services preview */}
                <div className="flex flex-col gap-2">
                  {barberServices.slice(0, 3).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#1a1a1a' }}
                    >
                      <span style={{ color: 'var(--color-white)' }}>{service.name}</span>
                      <span style={{ color: 'var(--color-green-light)' }}>
                        {formatPrice(service.price)}
                      </span>
                    </div>
                  ))}
                  {barberServices.length > 3 && (
                    <p className="text-xs text-center mt-1" style={{ color: 'var(--color-gray)' }}>
                      +{barberServices.length - 3} serviço{barberServices.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <div
                  className="mt-5 text-center py-3 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
                >
                  Agendar com {barber.name}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 pb-8 text-center">
        <a
          href="https://instagram.com/barbeariabrusquense"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-gray)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          @barbeariabrusquense
        </a>
      </footer>
    </main>
  )
}
