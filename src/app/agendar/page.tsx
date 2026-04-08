import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import type { Barber, Service } from '@/lib/types'
import UserMenu from '@/components/user-menu'
import SiteFooter from '@/components/site-footer'
import BarberCard from './barber-card'

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
    <main className="min-h-dvh flex flex-col">
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
              <BarberCard key={barber.id} barber={barber} services={barberServices} />
            )
          })}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
