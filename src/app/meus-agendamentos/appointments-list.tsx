'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDateDisplay, nowInSaoPaulo, formatDate } from '@/lib/slots'
import type { Appointment } from '@/lib/types'
import UserMenu from '@/components/user-menu'
import SiteFooter from '@/components/site-footer'
import InstallBanner from '@/components/install-banner'

interface Props {
  appointments: Appointment[]
}

export default function AppointmentsList({ appointments: initialAppointments }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showSuccess = searchParams.get('sucesso') === '1'

  const [appointments, setAppointments] = useState(initialAppointments)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState(showSuccess)

  const supabase = createClient()
  const now = nowInSaoPaulo()
  const todayStr = formatDate(now)

  // Separate future and past — considera data + horário
  const future = appointments
    .filter((a) => a.status === 'active' && new Date(`${a.date}T${a.start_time}`) > now)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))

  const pastAndCancelled = appointments
    .filter((a) => a.status === 'cancelled' || new Date(`${a.date}T${a.start_time}`) <= now)
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))

  function canCancel(apt: Appointment): boolean {
    if (apt.status === 'cancelled') return false
    const aptDateTime = new Date(`${apt.date}T${apt.start_time}`)
    const oneHourBefore = new Date(aptDateTime.getTime() - 60 * 60 * 1000)
    return now < oneHourBefore
  }

  async function handleCancel(id: string) {
    setCancellingId(id)

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (!error) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a))
      )
    }

    setCancellingId(null)
  }

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Link href="/agendar" className="p-2 -ml-2" style={{ color: 'var(--color-gray)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-white)' }}>
            Meus Agendamentos
          </h1>
        </div>
        <UserMenu />
      </header>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Success message */}
        {successMessage && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm flex items-center justify-between"
            style={{ backgroundColor: 'rgba(45,122,58,0.15)', border: '1px solid var(--color-green-primary)', color: 'var(--color-green-light)' }}
          >
            <span>Agendamento confirmado com sucesso!</span>
            <button onClick={() => { setSuccessMessage(false); router.replace('/meus-agendamentos') }} className="ml-2 p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        {/* Install banner — shown only right after a booking */}
        {showSuccess && <InstallBanner />}

        {appointments.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#1e1e1e' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray)" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-gray)' }}>
              Você ainda não tem agendamentos.
            </p>
            <Link
              href="/agendar"
              className="inline-block rounded-xl px-6 py-3 text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
            >
              Agendar agora
            </Link>
          </div>
        ) : (
          <>
            {/* Future */}
            {future.length > 0 && (
              <section className="mb-8">
                <h2
                  className="text-2xl mb-3 tracking-wide"
                  style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-white)' }}
                >
                  Próximos
                </h2>
                <div className="flex flex-col gap-3">
                  {future.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      canCancel={canCancel(apt)}
                      cancelling={cancellingId === apt.id}
                      onCancel={() => handleCancel(apt.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past / Cancelled */}
            {pastAndCancelled.length > 0 && (
              <section>
                <h2
                  className="text-2xl mb-3 tracking-wide"
                  style={{ fontFamily: 'var(--font-bebas)', color: 'var(--color-gray)' }}
                >
                  Histórico
                </h2>
                <div className="flex flex-col gap-3">
                  {pastAndCancelled.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      canCancel={false}
                      cancelling={false}
                      onCancel={() => {}}
                      isPast
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/agendar"
            className="inline-block rounded-xl px-6 py-3 text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--color-green-primary)', color: 'var(--color-white)' }}
          >
            Novo agendamento
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}

function AppointmentCard({
  appointment: apt,
  canCancel,
  cancelling,
  onCancel,
  isPast = false,
}: {
  appointment: Appointment
  canCancel: boolean
  cancelling: boolean
  onCancel: () => void
  isPast?: boolean
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const isCancelled = apt.status === 'cancelled'

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${isCancelled ? 'var(--color-error)' : 'var(--color-border)'}`,
        opacity: isPast || isCancelled ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {apt.barber && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
              style={{ border: '2px solid var(--color-green-primary)', backgroundColor: '#1e1e1e', color: 'var(--color-green-light)' }}
            >
              {apt.barber.avatar_url ? (
                <Image src={apt.barber.avatar_url} alt={apt.barber.name} width={40} height={40} className="rounded-full object-cover w-full h-full" />
              ) : (
                apt.barber.name.charAt(0)
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
                {apt.service?.name || 'Serviço'}
              </p>
              {apt.service && !isCancelled && (
                <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--color-green-light)' }}>
                  {formatPrice(apt.service.price)}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-gray)' }}>
              {apt.barber?.name || 'Barbeiro'}
            </p>
          </div>
        </div>

        {isCancelled && (
          <span
            className="text-[10px] font-bold uppercase px-2 py-1 rounded shrink-0"
            style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)' }}
          >
            Cancelado
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'var(--color-gray)' }}>
        <span className="flex items-center gap-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {formatDateDisplay(apt.date)}
        </span>
        <span className="flex items-center gap-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {apt.start_time.substring(0, 5)}
        </span>
      </div>

      {/* Cancel */}
      {canCancel && !isCancelled && (
        <div className="mt-3">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs font-medium py-1 transition-colors"
              style={{ color: 'var(--color-error)' }}
            >
              Cancelar agendamento
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-error)' }}>Tem certeza?</span>
              <button
                onClick={onCancel}
                disabled={cancelling}
                className="text-xs font-bold px-3 py-1 rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#3a1a1a', color: 'var(--color-error)' }}
              >
                {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ color: 'var(--color-gray)' }}
              >
                Não
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
