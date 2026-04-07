import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Barber, Service } from '@/lib/types'
import { formatPrice } from '@/lib/slots'
import UserMenu from '@/components/user-menu'
import SiteFooter from '@/components/site-footer'

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

  const barberList = (barbers || []) as Barber[]
  const serviceList = (services || []) as Service[]

  return (
    <main className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 w-full max-w-3xl mx-auto">
        <Image
          src="/logo-barbearia.png"
          alt="Barbearia Brusquense"
          width={140}
          height={60}
          className="object-contain"
          onError={undefined}
        />
        <UserMenu />
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
      <section className="flex-1 px-4 pb-12 max-w-3xl mx-auto w-full">
        <div className="grid gap-4 sm:grid-cols-2">
          {barberList.map((barber) => {
            const barberServices = serviceList.filter(
              (s) => s.barber_id === barber.id
            )
            return (
              <div
                key={barber.id}
                className="rounded-2xl p-6"
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
                    <Link
                      key={service.id}
                      href={`/agendar/${barber.slug}?service=${service.id}`}
                      className="flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-colors hover:brightness-125"
                      style={{ backgroundColor: '#1a1a1a' }}
                    >
                      <div className="flex flex-col">
                        <span style={{ color: 'var(--color-white)' }}>{service.name}</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-gray)' }}>
                          {service.duration_minutes} min
                        </span>
                      </div>
                      <span style={{ color: 'var(--color-green-light)' }}>
                        {formatPrice(service.price)}
                      </span>
                    </Link>
                  ))}
                  {barberServices.length > 3 && (
                    <p className="text-xs text-center mt-1" style={{ color: 'var(--color-gray)' }}>
                      +{barberServices.length - 3} serviço{barberServices.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={`/agendar/${barber.slug}`}
                  className="mt-5 block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                  style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
                >
                  Agendar com {barber.name}
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
